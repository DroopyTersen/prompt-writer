import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SCORE_COMPLEXITY } from "./scoreComplexity.example";
import usePersistedState from "~/utils/usePersistedState";

export type PromptWriteFormProps = {
  initial?: {
    task: string;
    examples: string;
  };
};
type FormValues = {
  task: string;
  examples: string;
};
export const PromptWriterForm = (props: PromptWriteFormProps) => {
  const { initial } = props;
  let [formValues, setFormValues] = usePersistedState<FormValues>(
    {
      task: initial?.task || "",
      examples: initial?.examples || "",
    },
    "prompt-writer-01"
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-3 mt-6">
        <Label htmlFor="content">Task</Label>
        <Textarea
          name="task"
          id="task"
          rows={8}
          value={formValues.task}
          onChange={(e) =>
            setFormValues({ ...formValues, task: e.target.value })
          }
          placeholder={SCORE_COMPLEXITY.task}
        ></Textarea>
        <p className="text-xs text-slate-500" data-description>
          A detailed description of what you are trying to accomplish.
        </p>
      </div>

      <div className="grid gap-3">
        <Label htmlFor="content">Examples</Label>
        <Textarea
          name="examples"
          id="examples"
          rows={8}
          value={formValues.examples}
          onChange={(e) =>
            setFormValues({ ...formValues, examples: e.target.value })
          }
          placeholder={SCORE_COMPLEXITY.examples}
        ></Textarea>
        <p className="text-xs text-slate-500" data-description>
          A list of example inputs and outputs.
        </p>
      </div>

      <div className="grid place-items-center">
        <Button type="submit" name="intent" value="generate">
          Generate Prompt
        </Button>
        <p className="text-xs mt-4 text-center text-slate-500" data-description>
          Use an LLM to do Prompt Engineering for you!
          <br /> You can review the generated prompt when it's done.
        </p>
      </div>
    </div>
  );
};
