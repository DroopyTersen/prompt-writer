import { readUrlTool } from "../../../../api/aiEngineer/tools/readUrl.tool";
import { searchWebTool } from "../../../../api/aiEngineer/tools/searchWeb.tool";
import { LLMEventEmitter } from "../streams/LLMEventEmitter";
import { getLLM } from "./getLLM";

// Remove or comment out this line as it's not working with Bun
// import { TextDecoderStream } from "node:stream/web";

// Instead, use the global TextDecoderStream provided by Bun

const main = async () => {
  let emitter = new LLMEventEmitter();
  emitter.on("tool_call", (toolCall) => {
    console.log("tool_call", toolCall);
  });
  emitter.on("tool_result", (toolResult) => {
    console.log("tool_result", toolResult.toolName);
  });
  // let llm = getLLM("openai", "gpt-4o-mini");
  let llm = getLLM("deepseek", "deepseek-coder");

  let answer = await llm.runTools(
    {
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that can answer questions and use tools. Typically you will take a question from a user and use that to craft a searchWeb query. then you will choose one or more results to call readUrl tool to learn more in order to answer the user's question.
          
          You should never base your answer only on a searchWeb result description. You should always use the readUrl tool to get more information.
          
          Often the search web result description is misleading, so you should always use the readUrl tool to get more information if the result looks like it could help you answer the user's question.`,
        },
        {
          role: "user",
          // content:
          //   "Can you explain the Remix routing convention. the V2 flat file routing thing they do. Provide me a list of all the differnent conventions for filenaming. Use the official remix docs for the answer. ",
          // content: "What are some of the best new features of React 19?",
          // content:
          //   "How do i go about access App Roles as claims in a VB .NET app that is using an azure app service with Authentication enabled (in the app service) using Azure AD. I've got the App Role created on the app registration, and i've been added to the app role. i successfully logged into the with my msft org account. now how do i do access control in code by grabbing the app role claim from httpcontext?",
          content:
            "What time is the men's olypmpic bball game against serbia today? it's a semifinal game. time in mountain time and time local olympic time",
        },
      ],
      tools: {
        searchWeb: searchWebTool,
        readUrl: readUrlTool,
      },
    },
    {
      emitter,
    }
  );
  console.log(answer.text);
};

main();
