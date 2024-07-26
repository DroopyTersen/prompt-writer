import { PromptResponsePair } from "./generatePromptExamples";
import { type OpenAI } from "openai";

export async function testPrompt(
  systemPrompt: string,
  inputExamples: PromptResponsePair[],
  openai: OpenAI
) {
  let results: Array<{
    input: string;
    expected: string;
    actual: string;
  }> = [];
  let requestPromises = inputExamples.map(async (example) => {
    return openai.chat.completions
      .create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: example.prompt,
          },
        ],
      })
      .then((response) => {
        results.push({
          input: example.prompt,
          expected: example.response,
          actual: response.choices[0].message.content || "",
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        results.push({
          input: example.prompt,
          expected: example.response,
          actual: "Error: " + error?.message ? error.message : error,
        });
      });
  });

  await Promise.allSettled(requestPromises);

  return inputExamples.map((example) => {
    return results.find((result) => result.input === example.prompt);
  });
}
