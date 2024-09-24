import { type LooseAutocomplete } from "~/toolkit/utils/typescript.utils";
import { type LLMEvent } from "./LLMEventEmitter";

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];
export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, any>;
  timestamp: number;
};
export type ToolResult = {
  toolCallId: string;
  toolDefinitionId: string;
  result: any;
  toolName: string;
};
export type ToolUse<TResult = any, TArgs = Record<string, any>> = {
  toolCallId: string;
  timestamp: number | undefined;
  name: string;
  args: TArgs | undefined;
  result: TResult;
  toolDefinitionId: string;
};

export interface LLMDataStream {
  sendText: (text: string) => void;
  sendLog: (message: string) => void;
  sendToolCall: (toolCall: ToolCall) => void;
  sendToolResult: (toolResult: ToolResult) => void;
  sendError: (error: any) => void;
  sendData: (data: JSONValue) => void;
}

type StreamMessageType = LooseAutocomplete<LLMEvent["type"]>;

export type GenericStreamMessage = {
  type: StreamMessageType;
  data: JSONValue;
};

export type StreamMessage = LLMEvent;
//  | GenericStreamMessage;

export type LLMDataMessage = Partial<ReturnType<typeof parseLLMEvents>> & {
  id?: string;
  role: "assistant" | "user" | "tool";
};

export const parseLLMEvents = (events: LLMEvent[]) => {
  let streamedText = "";
  let toolCalls: ToolCall[] = [];
  let toolResults: ToolResult[] = [];
  let logs: string[] = [];
  let data: JSONValue[] = [];
  for (let i = 0; i < events.length; i++) {
    let event = events[i];
    if (event.type === "content") {
      streamedText += event.data;
    } else if (event.type === "tool_call") {
      toolCalls.push(event.data);
    } else if (event.type === "tool_result") {
      toolResults.push(event.data);
    } else if (event.type === "log") {
      logs.push(event.data);
    } else if (event.type === "data") {
      data.push(event.data);
    }
  }
  let toolCallIds = [
    ...toolCalls.map((tc) => tc.id),
    ...toolResults.map((tr) => tr.toolCallId),
  ];
  let distinctToolCallIds = Array.from(new Set(toolCallIds));
  let toolUses: ToolUse[] = distinctToolCallIds.map((id) => {
    return {
      toolCallId: id,
      timestamp: toolCalls.find((tc) => tc.id === id)?.timestamp,
      name: toolCalls.find((tc) => tc.id === id)?.name || "",
      args: toolCalls.find((tc) => tc.id === id)?.args,
      result: toolResults.find((tr) => tr.toolCallId === id)?.result,
      toolDefinitionId:
        toolResults.find((tr) => tr.toolCallId === id)?.toolDefinitionId || "",
    } satisfies ToolUse;
  });
  return {
    content: streamedText,
    toolCalls,
    toolResults,
    toolUses,
    logs,
    data,
  };
};
