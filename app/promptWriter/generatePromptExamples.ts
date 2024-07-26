import type Anthropic from "@anthropic-ai/sdk";
import { findAll } from "~/utils";

export interface PromptResponsePair {
  prompt: string;
  response: string;
}

export async function generatePromptExamples(
  task: string,
  inputExamples: PromptResponsePair[],
  anthropic: Anthropic
): Promise<PromptResponsePair[]> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4000,
      temperature: 0.5,
      system: `<task>Given an example training sample, create seven additional samples for the same task that are even better. Each example should contain a <prompt> and a <response>.</task>
<rules>
1. Ensure the new examples are diverse and unique from one another.
2. They should all be perfect. If you make a mistake, this system won't work.
3. The prompt examples should capture the full range of possible inputs and outputs.
</rules>
Respond in this format:
<response_format>
<example_one>
<prompt>
PUT_PROMPT_HERE
</prompt>
<response>
PUT_RESPONSE_HERE
</response>
</example_one>
<example_two>
<prompt>
PUT_PROMPT_HERE
</prompt>
<response>
PUT_RESPONSE_HERE
</response>
</example_two>
...
</response_format>`,
      messages: [
        {
          role: "user",
          content: `<training_task>${task}</training_task>

${inputExamples
  .map(
    (example) => `<example>
  <prompt>
  ${example.prompt}
  </prompt>
  <response>
  ${example.response}
  </response>
</example>`
  )
  .join("")}`,
        },
      ],
    });
    const responseText = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    // Parse out the prompts and responses
    const promptsAndResponses: PromptResponsePair[] = [];
    const examples = findAll(
      /<example_\w+>(.*?)<\/example_\w+>/gs,
      responseText
    );

    for (const example of examples) {
      const prompt = findAll(/<prompt>(.*?)<\/prompt>/gs, example)[0].trim();
      const response = findAll(
        /<response>(.*?)<\/response>/gs,
        example
      )[0].trim();
      promptsAndResponses.push({ prompt, response });
    }

    return promptsAndResponses;
  } catch (error) {
    console.error("Error generating candidate prompts:", error);
    throw error;
  }
}
