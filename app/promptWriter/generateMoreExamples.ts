import { PromptResponsePair } from "./generatePromptExamples";
import { type OpenAI } from "openai";

const MAX_EXAMPLES = 5;
export async function generateMoreExamples(
  systemPrompt: string,
  inputExamples: PromptResponsePair[],
  openai: OpenAI
): Promise<PromptResponsePair[]> {
  console.log("🚀 | generateMoreExamples inputExamples:", inputExamples);
  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert example generator, skilled at creating diverse and unique prompts that cover the full spectrum of possibilities for a given task. Your mission is to generate 5 additional high-quality prompt examples based on the task description and any provided examples. These new examples should:

1. Be diverse and distinct from one another, showcasing different aspects or scenarios related to the task.
2. Represent perfect examples that align precisely with the task requirements.
3. Cover the full range of possible inputs and outputs for the given task.
4. Include at least one example that addresses an edge case or unusual scenario.

Adhere strictly to the following guidelines:
- Provide only the prompt part of the example, not the response.
- Present one prompt per line.
- Do not include any additional text, explanations, or formatting in your response.
- Ensure each example is complete, clear, and self-contained.
- Tailor the complexity and specificity of your examples to match the given task and any provided examples.

Your output should consist solely of 5 lines, each containing a unique and perfect prompt example. Your ability to generate these examples accurately and creatively is crucial for the success of this system.    
`,
      },
      {
        role: "user",
        content: `Here is the task:======${systemPrompt}======`,
      },
      {
        role: "user",
        content: `Here are some examples we already have:
======
${inputExamples.map((example) => example.prompt).join("\n")}
=====
`,
      },
      {
        role: "user",
        content: `Please generate ${MAX_EXAMPLES} more examples.`,
      },
    ],
  });

  if (response.choices[0].message.content) {
    return response.choices[0].message.content
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        return {
          prompt: line,
          response: "",
        };
      });
  } else {
    return [];
  }
}
