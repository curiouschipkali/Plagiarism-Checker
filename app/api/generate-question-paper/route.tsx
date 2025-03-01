import { google } from "@ai-sdk/google";
import { NextResponse } from "next/server";
import { Page, Text, View, Document, StyleSheet, renderToBuffer, PDFDownloadLink, renderToStream, renderToFile  } from '@react-pdf/renderer';
import { size } from "pdfkit/js/page";
import React from 'react'
import ReactPDF from '@react-pdf/renderer';
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {Markdown} from "@/components/markdown";
import { custom } from "zod";
dotenv.config();

export const maxDuration = 60;
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });



export async function POST(req: Request) {
  try {
    console.log("Request received");

    const formData = await req.formData();
    const pyqFile = formData.get("pyq") as File;
    const syllabusFile = formData.get("syllabus") as File;
    const customPrompt = formData.get("customPrompt") as string;

    if (!pyqFile || !syllabusFile) {
      return NextResponse.json({ error: "Two PDFs (PYQ & Syllabus) are required." }, { status: 400 });
    }

    const pyqBuffer = Buffer.from(await pyqFile.arrayBuffer()).toString("base64");
    const syllabusBuffer = Buffer.from( await syllabusFile.arrayBuffer()).toString("base64");

    console.log("Files received successfully");

    const result = await model.generateContent([
      {
          inlineData: {
              data: pyqBuffer,
              mimeType: "application/pdf",
          },
      },
      {
          inlineData: {
              data: syllabusBuffer,
              mimeType: "application/pdf",
          },
      },
      
      "These are the two PDFs. One is a PYQ for understanding how each question is graded and the structure of the paper. Analyze the PYQ to determine the type of questions, their marks distribution, and the number of questions per chapter. Ensure that all questions in the generated paper are strictly within the syllabus. Maintain the exact number of questions and total marks as in the PYQ. Distribute marks in the same way and ensure the difficulty progression follows the same pattern. Keep a balanced mix of easy, moderate, and difficult questions in the same ratio. Ensure that the variety of question types matches the PYQ, including any proof-based, application-based, or conceptual questions. Follow the formatting of the PYQ exactly, including the number of sections, line breaks, indentation, bolding, and numbering. No two questions should test the same concept in different wording. Each question should introduce a unique aspect of the syllabus. Reply with only the complete question paper and nothing else. Don't take the names of any unecessary brands/names title the paper strictly as Subject name and Question Paper. Don't give any unecessary information and strictly stick to the paper to be generated. Total Number of Questions must be EXACTLY equal to the number of main questions given in the PYQ pdf. Also Here is a custom prompt given by the user telling what is the requirement of the question paper like for example telling to include only specific chapters from the syllabus. If nothing important is mentioned then ignore it or else take it for consideration when making the paper.\n" + customPrompt,
      
  ]);
  console.log(customPrompt);
  const questionPaperText = result.response.text();
    
    if (!questionPaperText) throw new Error("Failed to generate question paper.");

    console.log("Generated Question Paper Text:", questionPaperText);

    const pdfStream = await createPDF(questionPaperText);

    console.log("returning response");
    console.log(pdfStream);
    return new Response(pdfStream, {
      headers: {
        "Content-Type": "application/pdf", 
        "Content-Disposition": "attachment; filename=question_paper.pdf",
      },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}


const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding:12
  },
  section: {
    margin: 10,
    padding: 12,
    flexGrow: 1
  }
});

const MyDocument = ({ questionPaperText }: { questionPaperText: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
      <Text>{questionPaperText}</Text>
      </View>
    </Page>
  </Document>
);

async function createPDF(questionPaperText: string){
  try {
    const stream = await ReactPDF.renderToStream(<MyDocument questionPaperText={questionPaperText} />);
    // await renderToFile(<MyDocument questionPaperText={questionPaperText} />, `${"C:/Users/Surya/Downloads"}/my-doc.pdf`);
    // console.log("Stream:", stream);
  return stream as unknown as ReadableStream;

  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF.");
  }
}
