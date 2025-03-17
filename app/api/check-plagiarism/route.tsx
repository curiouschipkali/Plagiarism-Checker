import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

export const maxDuration = 60;
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

const X_API_KEY = process.env.X_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;


interface PlagiarismSource {
  text: string;
  source: string;
  similarity: number;
  url?: string;
}

interface PlagiarismResponse {
  overallSimilarity: number;
  sources: PlagiarismSource[];
}

export async function POST(req: Request) {
  try {
    console.log("Plagiarism check request received");

    const formData = await req.formData();
    const documentFile = formData.get("document") as File;

    if (!documentFile) {
      return NextResponse.json({ error: "PDF document is required." }, { status: 400 });
    }

    const documentBuffer = Buffer.from(await documentFile.arrayBuffer()).toString("base64");

    console.log("File received successfully");

    // Step 1: Extract text content from PDF using Gemini
    const extractionResult = await model.generateContent([
      {
        inlineData: {
          data: documentBuffer,
          mimeType: "application/pdf",
        },
      },
      `Extract the following details from this PDF and return ONLY valid JSON, without markdown or extra text:

      {
        "title": "Extracted Project Title",
        "goal": "Extracted Project Goal",
        "students": ["Student Name 1", "Student Name 2", "Student Name 3"]
      }

      Ensure all fields are properly formatted as a JSON object.`,
    ]);
    
    console.log(extractionResult.response.text());
    const extractedText = extractionResult.response.text();

    let cleanedExtractedText = cleanJsonResponse(extractedText);

    let projectDetails;
    try {
      projectDetails = JSON.parse(cleanedExtractedText);
    } catch (error) {
      console.error("Error parsing extracted project details:", error);
      return NextResponse.json({ error: "Invalid JSON response from LLM." }, { status: 500 });
    }

    console.log("Project details extracted:", projectDetails);

    
    if (!extractedText) {
      throw new Error("Failed to extract text from PDF.");
    }

    console.log("Text extracted successfully");

    

    // Step 2: Generate optimized search queries
    const queryGenerationResult = await model.generateContent([
      `Generate 3 search queries that would help find similar content to this text. Each query should be focused on different aspects of the content. Return just the queries separated by newlines, without any additional text or numbering:
      
      ${extractedText.substring(0, 1000)}`
    ]);

    
    
    const searchQueries = queryGenerationResult.response.text().split('\n').filter(q => q.trim());
    console.log("Generated search queries:", searchQueries);

    // Step 3: Search for similar content on the web
    const webResults = await searchWeb(searchQueries);
    console.log(`Found ${webResults.length} web results`);

    // Step 4: Search for similar repositories on GitHub
    const githubResults = await searchGithub(searchQueries);
    console.log(`Found ${githubResults.length} GitHub repositories`);

    // Step 5: Analyze plagiarism using Gemini
    const plagiarismResult = await analyzePlagiarism(
      extractedText, 
      webResults,
      githubResults
    );

    console.log("Plagiarism analysis completed");

    const collection = client.db("Db1");
    const database = collection.collection("Synopsis Details");
    await client.connect();
    const result = await database.insertOne({ title: projectDetails.title,
                    goal: projectDetails.goal,
                    students: projectDetails.students,
                    plagiarism: plagiarismResult,
 });

    return NextResponse.json(plagiarismResult);



  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process plagiarism check request" },
      { status: 500 }
    );
  }
}

async function searchWeb(queries: string[]) {
  try {
    const searchResults = [];
    
    for (const query of queries.slice(0, 2)) { 
      try {
        const response = await axios.post(
          "https://google.serper.dev/search",
          { q: query },
          { headers: { 'X-API-KEY': X_API_KEY, 'Content-Type': 'application/json' } }
        );
        
        if (response.data.organic) {
          searchResults.push(...response.data.organic);
        }
      } catch (err) {
        console.error("Error in web search:", err);
      }
    }
    
    return searchResults;
  } catch (error) {
    console.error("Web search error:", error);
    return [];
  }
}

async function searchGithub(queries: string[]) {
  try {
    const githubResults = [];
    
    for (const query of queries.slice(0, 1)) { 
      try {
        const MAX_QUERY_LENGTH = 250;
        const encodedQuery = encodeURIComponent(query.substring(0, MAX_QUERY_LENGTH));
        const url = `https://api.github.com/search/repositories?q=${encodedQuery}&sort=stars&order=desc`;
        
        const response = await axios.get(url, {
          headers: { 
            "Authorization": `token ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github.v3+json"
          }
        });
        
        if (response.data.items) {
          const repositories = response.data.items.slice(0, 5).map((repo: any) => ({
            name: repo.name,
            url: repo.html_url,
            owner: repo.owner.login,
            description: repo.description || "No description available."
          }));
          
          githubResults.push(...repositories);
        }
      } catch (err) {
        console.error("Error in GitHub search:", err);
      }
    }
    
    return githubResults;
  } catch (error) {
    console.error("GitHub search error:", error);
    return [];
  }
}

async function analyzePlagiarism(
  text: string, 
  webResults: any[],
  githubResults: any[],
): Promise<PlagiarismResponse> {
  try {
    const result = await model.generateContent([
      `You are a plagiarism detection expert. Analyze the following text against the web search results and GitHub repositories to identify potential plagiarism.
      
      TEXT TO ANALYZE:
      ${text.substring(0, 5000)}
      
      WEB SEARCH RESULTS:
      ${JSON.stringify(webResults)}
      
      GITHUB REPOSITORIES:
      ${JSON.stringify(githubResults)}
      
      
      Provide a JSON response with the following structure without markdown code blocks, just the raw JSON:
      {
        "overallSimilarity": (number between 0-100),
        "sources": [
          {
            "text": "the exact text from the document that appears to be plagiarized",
            "source": "name of the source website, document, or GitHub repository",
            "similarity": (number between 0-100 representing match percentage),
            "url": "URL of the source if available"
          }
        ]
      }
      
      For GitHub repositories, extract code snippets or descriptions that appear similar to the text.
      Focus on identifying specific matches rather than general topics.
      IMPORTANT: Return ONLY the raw JSON with no markdown formatting, code blocks, or additional text.`
    ]);

    const resultText = result.response.text();
    
    const cleanedResult = cleanJsonResponse(resultText);
    
    try {
      const plagiarismData = JSON.parse(cleanedResult);
      return plagiarismData as PlagiarismResponse;
    } catch (e) {
      console.error("Error parsing plagiarism result:", e);
      console.error("Attempted to parse:", cleanedResult);
      
      return generateFallbackResponse(webResults, githubResults);
    }
  } catch (error) {
    console.error("Plagiarism analysis error:", error);
    return {
      overallSimilarity: 0,
      sources: []
    };
  }
}

// Helper function to clean JSON response from Gemini
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks if present
  let cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  
  const jsonStart = cleanedText.indexOf('{');
  const jsonEnd = cleanedText.lastIndexOf('}') + 1;
  
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    cleanedText = cleanedText.substring(jsonStart, jsonEnd);
  }
  
  return cleanedText;
}

function generateFallbackResponse(webResults: any[], githubResults: any[]): PlagiarismResponse {
  const sources: PlagiarismSource[] = [];
  
  webResults.slice(0, 3).forEach((result, index) => {
    if (result.title && result.link) {
      sources.push({
        text: result.snippet || "Content may be similar to this source.",
        source: result.title,
        similarity: 50 - (index * 10),
        url: result.link
      });
    }
  });
  
  // Add GitHub results
  githubResults.slice(0, 2).forEach((repo, index) => {
    if (repo.name && repo.url) {
      sources.push({
        text: repo.description || "Repository may contain similar code or concepts.",
        source: `${repo.name} (GitHub)`,
        similarity: 40 - (index * 10), 
        url: repo.url
      });
    }
  });
   
  return {
    overallSimilarity: sources.length > 0 ? 45 : 0,
    sources: sources
  };
}