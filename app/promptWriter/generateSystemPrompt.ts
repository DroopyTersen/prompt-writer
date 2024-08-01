import type Anthropic from "@anthropic-ai/sdk";
import { PromptResponsePair } from "./generatePromptExamples";

export async function generateSystemPrompt(
  task: string,
  promptExamples: PromptResponsePair[],
  anthropic: Anthropic
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1000,
      temperature: 0.5,
      system: `<your_role>Given a user-description of their <task> ${
        promptExamples?.length > 0
          ? "and a set of prompt / response pairs (it'll be in JSON for easy reading) for the types of outputs we want to generate given inputs"
          : ""
      }, write a fantastic system prompt that describes the task to be done perfectly.</your_role>

<rules>
1. Do this perfectly.
2. Respond only with the system prompt, and nothing else. No other text will be allowed.
3. Use any prompt engineering techniques that are appropriate for the task.
</rules>

Respond in this format:
<system_prompt>
WRITE_SYSTEM_PROMPT_HERE
</system_prompt>`,
      messages: [
        {
          role: "user",
          content: `<task>${task}</task>

<prompt_response_examples>
${JSON.stringify(promptExamples, null, 2)}
</prompt_response_examples>`,
        },
      ],
    });

    const responseText = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    // Parse out the system prompt
    const systemPrompt = responseText
      .split("<system_prompt>")[1]
      .split("</system_prompt>")[0]
      .trim();

    return systemPrompt;
  } catch (error) {
    console.error("Error generating system prompt:", error);
    throw error;
  }
}

export const formatSystemPrompt = (
  systemPrompt: string,
  examples: PromptResponsePair[]
) => {
  if (!examples.length) return systemPrompt;
  return `${systemPrompt}

## Examples
${examples
  .map(
    (example) => `
Q: ${example.prompt}
A: ${example.response}`
  )
  .join("\n")}`;
};
