import { PromptResponsePair } from "./generatePromptExamples";
import { type OpenAI } from "openai";

export async function generateMoreExamples(
  systemPrompt: string,
  inputExamples: PromptResponsePair[],
  openai: OpenAI
): Promise<PromptResponsePair[]> {
  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Given a task, and then some examples, your job is to  generate 5 more examples. We only want the prompt part of the example, not the response. The examples should be diverse and unique from one another. They should all be perfect. If you make a mistake, this system won't work. Put one prompt per line. Do not put any other text in the response.
<rules>
1. Ensure the new examples are diverse and unique from one another.
2. They should all be perfect. If you make a mistake, this system won't work.
3. The prompt examples should capture the full range of possible inputs and outputs.
</rules>        
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

Please generate 5 more examples.`,
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
