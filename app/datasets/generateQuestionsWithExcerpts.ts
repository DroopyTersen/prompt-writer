import { getCachedMessageContent, getLLM } from "~/toolkit/ai/llm/getLLM";
import { z } from "zod";

export interface QuestionData {
  question: string;
  references: string[];
}

export interface InvalidQuestion {
  questionData: QuestionData;
  reason: string;
}

export const generateQuestionsWithExcerpts = async (corpus: string) => {
  // limit to about 25k tokens
  corpus = corpus.slice(0, 100_000);
  const llm = getLLM("anthropic", "claude-3-5-sonnet-20240620");
  let result = await llm.generateData({
    schema: z.object({
      oath: z.string(),
      questions: z.array(
        z.object({
          question: z.string(),
          references: z.array(z.string()),
        })
      ),
    }),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          getCachedMessageContent(
            `Generate questions based on the following corpus:\n\n${corpus}`
          ),
        ],
      },
    ],
  });

  // Validate initial references
  let { valid, invalid } = validateReferences(
    corpus,
    result.object?.questions || []
  );

  if (invalid.length > 0) {
    const fixedQuestions = await llm.generateData({
      schema: z.object({
        oath: z.string(),
        questions: z.array(
          z.object({
            question: z.string(),
            references: z.array(z.string()),
          })
        ),
      }),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            getCachedMessageContent(
              `Generate questions based on the following corpus:\n\n${corpus}`
            ),
          ],
        },
        {
          role: "assistant",
          content: JSON.stringify(invalid.map((q) => q.questionData)),
        },
        {
          role: "user",
          content:
            "No, those references are not valid, exact matches.\n" +
            CORRECTIVE_PROMPT,
        },
      ],
    });
    let retryResult = validateReferences(
      corpus,
      fixedQuestions?.object?.questions || []
    );
    valid = [...valid, ...retryResult.valid];
  }

  return valid;
};

const validateReferences = (
  corpus: string,
  questions: QuestionData[]
): { valid: QuestionData[]; invalid: InvalidQuestion[] } => {
  const valid: QuestionData[] = [];
  const invalid: InvalidQuestion[] = [];

  questions.forEach((q) => {
    const { references } = q;
    const allValid = references.every((ref) => corpus.includes(ref));

    if (allValid) {
      valid.push(q);
    } else {
      invalid.push({
        questionData: q,
        reason: "One or more references do not exactly match the corpus.",
      });
    }
  });

  return { valid, invalid };
};

const SYSTEM_PROMPT = `You are an agent that generates questions from provided text. Your job is to generate a question and provide the relevant sections from the text as references.

Instructions:

For the provided corpus, generate a list of 6 questions that can be answered solely by the facts in the corpus.
Extract all significant facts that answer each generated question.
Format the response in JSON format with two fields:
'question': A question directly related to these facts, ensuring it can only be answered using the references provided.
'references': A list of all text sections that answer the generated question. These must be exact copies from the original corpus and should be whole sentences where possible.

Notes: Make the question more specific. Do not ask a question about multiple topics. Do not ask a question with over 5 references.

Include the following oath in every response:
"I will not use the word 'and' in the question unless it is part of a proper noun. I will also make sure the question is concise."

Example:

Text: "Experiment A: The temperature control test showed that at higher temperatures, the reaction rate increased significantly, resulting in quicker product formation. However, at extremely high temperatures, the reaction yield decreased due to the degradation of reactants.

...

Response: { 'oath': "I will not use the word 'and' in the question unless it is part of a proper noun. I will also make sure the question is concise.", 'question': 'What experiments were done in this paper?', 'references': ['Experiment A: The temperature control test showed that at higher temperatures, the reaction rate increased significantly, resulting in quicker product formation.', ...] }

DO NOT USE THE WORD 'and' IN THE QUESTION UNLESS IT IS PART OF A PROPER NOUN. YOU MUST INCLUDE THE OATH ABOVE IN YOUR RESPONSE. YOU MUST ALSO NOT REPEAT A QUESTION THAT HAS ALREADY BEEN USED.`;

// Corrective prompt for invalid references
const CORRECTIVE_PROMPT = `The references you provided did not exactly match the corpus. Please try again and ensure the excerpts are exact matches. Make sure to include the oath in your response.`;
