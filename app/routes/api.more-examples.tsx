import { ActionFunctionArgs } from "@remix-run/cloudflare";
import OpenAI from "openai";
import { z } from "zod";
import { generateMoreExamples } from "~/promptWriter/generateMoreExamples";
import {
  inputExamplesToString,
  parseInputExamples,
} from "~/promptWriter/parseForm";
import { validateSchema } from "~/utils/validateSchema";

export const MoreExamplesInput = z.object({
  systemPrompt: z.string(),
  inputExamples: z.string().optional().transform(parseInputExamples),
});

export const action = async ({ request, context }: ActionFunctionArgs) => {
  let formData = await request.formData();
  let input = validateSchema(formData, MoreExamplesInput);
  let openai = new OpenAI({
    // @ts-expect-error
    apiKey: context.cloudflare.env["OPENAI_API_KEY"],
  });
  let extraExamples = await generateMoreExamples(
    input.systemPrompt,
    input.inputExamples,
    openai
  );
  return inputExamplesToString(extraExamples);
};
