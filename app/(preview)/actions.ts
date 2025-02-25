"use server";

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export const generateQuizTitle = async (file: string) => {
  const result = await generateObject({
    model: google("gemini-2"),
    schema: z.object({
      title: z
        .string()
        .describe(
          "A max three word title for the Question Paper based on the file names and subjects given to you as context.",
        ),
    }),
    prompt:
      "Generate a title for the question Paper based on the following (PDF) file names, and subjects. Try and extract as much info from the file names as possible. If the file name is just numbers or incoherent, just return Question Paper.\n\n " + file,
  });
  return result.object.title;
};
