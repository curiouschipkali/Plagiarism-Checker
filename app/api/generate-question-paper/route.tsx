import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
// import puppeteer from "puppeteer";
import { Page, Text, View, Document, StyleSheet, renderToBuffer, PDFDownloadLink, renderToStream, renderToFile  } from '@react-pdf/renderer';
import { size } from "pdfkit/js/page";
import React from 'react'
import ReactPDF from '@react-pdf/renderer';
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

export const maxDuration = 180;
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });



export async function POST(req: Request) {
  try {
    console.log("Request received");

    const formData = await req.formData();
    const pyqFile = formData.get("pyq") as File;
    const syllabusFile = formData.get("syllabus") as File;

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
      
      "These are the two PDFs. One is a PYQ for understanding grading and structure. The other is a syllabus. Generate a question paper that follows the format, weightage, and difficulty distribution of the PYQ while ensuring all questions are within the syllabus. Maintain the same number of questions and formatting style.",
      
  ]);
  
    
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
    backgroundColor: '#E4E4E4'
  },
  section: {
    margin: 10,
    padding: 10,
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

export async function createPDF(questionPaperText: string){
  try {
    const stream = await ReactPDF.renderToStream(<MyDocument questionPaperText={questionPaperText} />);
    await renderToFile(<MyDocument questionPaperText={questionPaperText} />, `${"C:/Users/Surya/Downloads"}/my-doc.pdf`);
    console.log("Stream:", stream);
  return stream as unknown as ReadableStream;

  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF.");
  }
}
