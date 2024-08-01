import { z } from "zod";
import { PromptResponsePair } from "./generatePromptExamples";

export const parseInputExamples = (
  inputExamples?: string
): PromptResponsePair[] => {
  console.log("🚀 | inputExamples:", inputExamples);
  try {
    if (!inputExamples) return [];
    // Split the text into individual Q&A pairs
    const pairs = inputExamples
      .split(/\n(?=Q:)/)
      .filter((pair) => pair.trim() !== "");

    // Process each pair into an object with input and output
    return pairs.map((pair) => {
      // Split the pair into question and answer
      const [question, answer] = pair
        .split(/\n(?=A:)/)
        .map((part) => part.trim());

      // Remove the 'Q:' and 'A:' prefixes
      const input = question?.replace?.(/^Q:\s*/, "").trim() || "";
      const output = answer?.replace?.(/^A:\s*/, "").trim() || "";

      return { prompt: input, response: output } as PromptResponsePair;
    });
  } catch (error) {
    console.error("Error parsing input examples:", error);
    throw new Error(
      "Error parsing input examples. Please make examples are in this format: \nQ: <prompt>\nA: <response>\nQ: <prompt>\nA: <response>\n..."
    );
  }
};

export const PromptWriterInput = z.object({
  task: z.string(),
  examples: z.string().optional().transform(parseInputExamples),
  finalExamples: z.string().optional(),
  finalSystemPrompt: z.string().optional(),
});

export type PromptWriterInput = z.infer<typeof PromptWriterInput>;

export const inputExamplesToString = (inputExamples: PromptResponsePair[]) => {
  return inputExamples
    .map(
      (inputExample) => `Q: ${inputExample.prompt}\nA: ${inputExample.response}`
    )
    .join("\n\n");
};
