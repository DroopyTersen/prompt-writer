import { JSONValue, StreamingTextResponse, formatStreamPart } from "ai";
import { LLMDataStream, ToolCall, ToolResult } from "./LLMDataStream";
import { createReadableStream } from "./createReadableStream";

export type VercelStreamType = Parameters<typeof formatStreamPart>[0];

export interface VercelStreamMessage {
  type: VercelStreamType;
  data: JSONValue;
}

export interface TextDataStream extends LLMDataStream {
  stream: ReadableStream<Uint8Array>;
  toResponse: () => Response;
  close: () => void;
}

export const createVercelDataStream = (
  signal?: AbortSignal
): TextDataStream => {
  let { stream, enqueue, close } = createReadableStream(signal);

  const send = (message: VercelStreamMessage): void => {
    if (message.type === "message_annotations" || message.type === "data") {
      if (!Array.isArray(message.data)) {
        message.data = [message.data] as any;
      }
    }
    enqueue(formatStreamPart(message.type, message.data as any));
  };

  const sendText = (text: string) => {
    send({ type: "text", data: text });
  };

  const sendLog = (message: string) => {
    send({
      type: "message_annotations",
      data: { type: "log", data: message },
    });
  };

  const sendError = (error: any) => {
    send({
      type: "error",
      data: {
        type: "error",
        data: error,
      },
    });
  };

  const sendToolCall = (toolCall: ToolCall) => {
    send({
      type: "message_annotations",
      data: { type: "tool_call", data: toolCall },
    });
  };

  const sendToolResult = (toolResult: ToolResult) => {
    send({
      type: "message_annotations",
      data: { type: "tool_result", data: toolResult },
    });
  };

  return {
    stream,
    close,
    toResponse: () => new StreamingTextResponse(stream),
    sendText,
    sendLog,
    sendError,
    sendToolCall,
    sendToolResult,
  };
};
