import { ActionFunction, json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useState, useEffect } from "react";
import { validateSchema } from "~/utils/validateSchema";
import { getLLM } from "~/toolkit/ai/llm/getLLM";
import { Overlay } from "~/toolkit/components/Overlay";
import {
  AiOutlineLoading3Quarters as Spinner,
  AiOutlineDelete,
} from "react-icons/ai"; // Importing delete icon
import {
  generateQuestionsWithExcerpts,
  QuestionData,
} from "~/datasets/generateQuestionsWithExcerpts";
import usePersistedState from "~/utils/usePersistedState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import shadcn Tabs components
import { BsTrash } from "react-icons/bs";

const DatasetInput = z.object({
  url: z.string().url(),
});

type ActionData = {
  error?: string;
  questions?: QuestionData[];
};

export const action: ActionFunction = async ({ request, context }) => {
  try {
    const formData = await request.formData();
    const input = validateSchema(formData, DatasetInput);

    // Fetch URL contents
    const response = await fetch(`https://r.jina.ai/${input.url}`);
    const corpus = await response.text();
    let dataset = await generateQuestionsWithExcerpts(corpus);
    return json<ActionData>({ questions: dataset });
  } catch (error: any) {
    return json<ActionData>({ error: error.message });
  }
};

export default function Datasets() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";
  const [activeTab, setActiveTab] = useState<"preview" | "json">("preview");
  const [persistedQuestions, setPersistedQuestions] = usePersistedState<
    QuestionData[]
  >([], "dataset-questions");

  useEffect(() => {
    if (actionData?.questions) {
      setPersistedQuestions(actionData.questions);
    }
  }, [actionData?.questions]);

  const clearDataset = () => {
    setPersistedQuestions([]);
  };

  // Function to remove a question by index
  const removeQuestion = (index: number) => {
    const updatedQuestions = persistedQuestions.filter((_, i) => i !== index);
    setPersistedQuestions(updatedQuestions);
  };

  // Function to remove a reference from a specific question
  const removeReference = (questionIndex: number, refIndex: number) => {
    const updatedQuestions = persistedQuestions.map((q, i) => {
      if (i === questionIndex) {
        const updatedRefs = q.references.filter((_, j) => j !== refIndex);
        return { ...q, references: updatedRefs };
      }
      return q;
    });
    setPersistedQuestions(updatedQuestions);
  };

  return (
    <div className="font-sans p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-4">Dataset Generator</h1>
      <Form method="post">
        <fieldset disabled={isLoading} className="space-y-8">
          {isLoading && (
            <Overlay className="bg-white" opacity={0.7}>
              <div className="flex flex-col items-center justify-center">
                <span className="text-lg font-bold uppercase animate-pulse">
                  Generating Dataset...
                </span>
                <Spinner className="mt-2 h-7 w-7 animate-spin opacity-70" />
              </div>
            </Overlay>
          )}
          {actionData?.error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <pre className="text-sm font-mono font-bold">
                {actionData.error}
              </pre>
            </div>
          )}
          <div className="grid gap-3">
            <Label htmlFor="url">Enter URL</Label>
            <Textarea
              name="url"
              id="url"
              rows={3}
              placeholder="https://example.com/article"
            />
          </div>
          <div className="flex space-x-4">
            <Button type="submit">Generate Dataset</Button>
            <Button type="button" onClick={clearDataset} variant="outline">
              Clear Dataset
            </Button>
          </div>
        </fieldset>
      </Form>
      {persistedQuestions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Generated Questions</h2>
          {/* Replace custom tabs with shadcn Tabs */}
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <ul className="space-y-6">
                {persistedQuestions.map((q, index) => (
                  <li key={index} className="border p-4 rounded-lg relative">
                    {/* Trash icon button to remove the entire question */}
                    <button
                      className="absolute top-2 right-2 text-red-700 hover:text-red-600"
                      onClick={() => removeQuestion(index)}
                      aria-label="Delete Question"
                    >
                      <BsTrash size={20} />
                    </button>
                    <p className="font-semibold mb-2">{q.question}</p>
                    {/* <h3 className="font-medium mb-1">References:</h3> */}
                    <ul className="list-disc pl-5 space-y-3">
                      {q.references.map((ref, refIndex) => (
                        <li
                          key={refIndex}
                          className="flex items-center text-sm border-l-2 border-gray-500 pl-2"
                        >
                          <span>"{ref}"</span>
                          {/* Trash icon button to remove a specific reference */}
                          <button
                            className="ml-2 text-red-700 hover:text-red-600"
                            onClick={() => removeReference(index, refIndex)}
                            aria-label="Delete Reference"
                          >
                            <BsTrash size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="json">
              <pre className="bg-slate-100 p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap">
                {JSON.stringify(persistedQuestions, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
