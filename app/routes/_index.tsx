import type {
  ActionFunction,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { BsChevronRight } from "react-icons/bs";
import { Textarea } from "@/components/ui/textarea";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PromptWriterForm } from "~/promptWriter/PromptWriterForm";
import { validateSchema } from "~/utils/validateSchema";
import {
  inputExamplesToString,
  parseInputExamples,
  PromptWriterInput,
} from "~/promptWriter/parseForm";
import { SCORE_COMPLEXITY } from "~/promptWriter/scoreComplexity.example";
import {
  generatePromptExamples,
  PromptResponsePair,
} from "~/promptWriter/generatePromptExamples";
import {
  formatSystemPrompt,
  generateSystemPrompt,
} from "~/promptWriter/generateSystemPrompt";
import Anthropic from "@anthropic-ai/sdk";
import WizardNav, { WizardStep } from "~/promptWriter/WizardNav";
import { useEffect, useState } from "react";
import usePersistedState from "~/utils/usePersistedState";
import { useIsHydrated } from "~/utils/useIsHydrated";
import OpenAI from "openai";
import { testPrompt } from "~/promptWriter/testPrompt";

export const meta: MetaFunction = () => {
  return [
    { title: "Prompt Writer" },
    {
      name: "description",
      content: "Helps you Prompt Engineer",
    },
  ];
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  let formData = await request.formData();
  let input = validateSchema(formData, PromptWriterInput);
  let intent = formData.get("intent");
  console.log("🚀 | action | intent:", intent, input);
  if (intent === "generate") {
    // @ts-ignore
    let apiKey: string = context.cloudflare.env["ANTHROPIC_API_KEY"];
    let anthropic = new Anthropic({
      apiKey,
    });

    let promptExamples = await generatePromptExamples(
      input.task,
      input.examples,
      anthropic
    );
    let systemPrompt = await generateSystemPrompt(
      input.task,
      promptExamples,
      anthropic
    );
    let nextStep = intent === "generate" ? "02" : "03";
    return {
      input,
      promptExamples,
      systemPrompt,
      nextStep,
      testResults: [],
      fullSystemPrompt: formatSystemPrompt(systemPrompt, promptExamples),
      // fullSystemPrompt2: formatSystemPrompt(systemPrompt2, promptExamples2),
      submitted: {
        task: formData.get("task"),
        examples: formData.get("examples"),
      },
    };
  } else if (
    intent === "test" &&
    input.finalExamples &&
    input.finalSystemPrompt
  ) {
    let systemPrompt = input.finalSystemPrompt || "";
    let promptExamples = parseInputExamples(input.finalExamples);
    let openai = new OpenAI({
      // @ts-ignore
      apiKey: context.cloudflare.env["OPENAI_API_KEY"],
    });
    let results = await testPrompt(systemPrompt, promptExamples, openai);
    return {
      input,
      promptExamples,
      fullSystemPrompt: input.finalSystemPrompt,
      nextStep: "03",
      testResults: results,
    };
  }

  throw new Response("invalid intent", { status: 400 });
};

const wizardSteps: WizardStep[] = [
  {
    id: "01",
    name: "Draft",
  } as const,
  {
    id: "02",
    name: "Review",
  } as const,
  {
    id: "03",
    name: "Test",
  } as const,
];
export default function Index() {
  let actionData = useActionData<typeof action>();
  let navigation = useNavigation();
  let [currentStep, setCurrentStep] = usePersistedState(
    "01",
    "prompt-writer-step"
  );
  let isLoading = navigation.state !== "idle";

  let [systemPrompt, setSystemPrompt] = usePersistedState(
    "",
    "prompt-writer-02"
  );
  let [inputExamples, setInputExamples] = usePersistedState<string>(
    "",
    "prompt-writer-03"
  );
  useEffect(() => {
    if (actionData?.fullSystemPrompt) {
      setSystemPrompt(actionData.fullSystemPrompt);
    }
  }, [actionData?.fullSystemPrompt]);
  useEffect(() => {
    if (actionData?.promptExamples && actionData.promptExamples.length > 0) {
      setInputExamples(inputExamplesToString(actionData.promptExamples));
    }
  }, [actionData?.promptExamples]);

  useEffect(() => {
    if (actionData?.nextStep) {
      setCurrentStep(actionData.nextStep);
    }
  }, [actionData?.nextStep]);

  let isHydrated = useIsHydrated();
  return (
    <div className="font-sans p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-4">Prompt Writer</h1>
      <div className="space-y-2 text-sm mb-4">
        <p>
          You know who is great at figuring out how to talk to an LLM? An LLM!
        </p>
      </div>
      <WizardNav
        steps={wizardSteps}
        currentStep={currentStep}
        onChange={setCurrentStep}
      />
      {isHydrated && (
        <Form method="post">
          <fieldset
            disabled={isLoading}
            className="bg-slate-50 mt-4 p-4 rounded-lg"
          >
            <div className={currentStep === "01" ? "" : "hidden"}>
              <p className="mt-6 text-base">
                Roughly describe the task you want to accomplish. Then provide a
                fiew examples of inputs and outputs.
              </p>
              <PromptWriterForm initial={SCORE_COMPLEXITY} />
            </div>

            <div className={currentStep === "02" ? "" : "hidden"}>
              <PromptReviewForm
                value={systemPrompt}
                onNext={() => setCurrentStep("03")}
                onChange={setSystemPrompt}
              />
            </div>

            <div className={currentStep === "03" ? "" : "hidden"}>
              <TestPromptTab
                value={inputExamples}
                onChange={setInputExamples}
                results={actionData?.testResults as any}
              />
            </div>
          </fieldset>
        </Form>
      )}
    </div>
  );
}

interface PromptReviewFormProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}
function PromptReviewForm({ value, onChange, onNext }: PromptReviewFormProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-3 mt-6">
        <Label htmlFor="content">System Prompt</Label>
        <Textarea
          name="finalSystemPrompt"
          id="finalSystemPrompt"
          rows={20}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            "Please first go to the Draft step and generate a system prompt."
          }
        ></Textarea>
        <p className="text-xs text-slate-500" data-description>
          You can edit and tweak the AI powered prompt engineering here.
        </p>
      </div>
      <div className="flex justify-end">
        <div className="text-right">
          <div className="relative">
            <Button
              type="button"
              className="text-white w-32"
              disabled={!value}
              onClick={() => onNext()}
              title={
                !value ? "Please generate or enter a system prompt first" : ""
              }
            >
              Next
            </Button>
          </div>
          <p
            className="text-sm mt-4 text-center text-slate-500"
            data-description
          >
            {value ? (
              <>
                Test your system prompt using <code>gpt-4o-mini</code>.
              </>
            ) : (
              "Please write/generate a system prompt."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

type TestPromptTabProps = {
  value: string;
  onChange: (value: string) => void;
  results?: Array<{
    input: string;
    expected: string;
    actual: string;
  }>;
};
function TestPromptTab({ value, onChange, results }: TestPromptTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-3">
        <Label htmlFor="content">Examples</Label>
        <Textarea
          name="finalExamples"
          id="finalExamples"
          rows={20}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={SCORE_COMPLEXITY.examples}
        ></Textarea>
        <p className="text-xs text-slate-500" data-description>
          A list of example inputs and outputs.
        </p>
      </div>

      <div className="grid place-items-center">
        <Button type="submit" name="intent" value="test">
          Test Prompt
        </Button>
        <p className="text-xs mt-4 text-center text-slate-500" data-description>
          Use <code>gpt-4o-mini</code> to test your prompt.
        </p>
      </div>
      {results && results?.length > 0 && (
        <div className="mt-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Input</th>
                <th className="px-4 py-2 text-left">Expected</th>
                <th className="px-4 py-2 text-left">Actual</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.input}>
                  <td className="px-4 py-2 text-left">{result.input}</td>
                  <td className="px-4 py-2 text-left">{result.expected}</td>
                  <td className="px-4 py-2 text-left">{result.actual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
