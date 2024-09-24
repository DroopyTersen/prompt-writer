import {
  JSONValue,
  LLMDataStream,
  StreamMessage,
  ToolCall,
  ToolResult,
} from "./LLMDataStream";
import { LLMEventEmitter } from "./LLMEventEmitter";
import { createReadableStream } from "./createReadableStream";

interface SendFunctionArgs {
  /**
   * @default "message"
   */
  event?: string;
  data: StreamMessage;
}

export interface SendEventStreamFunction {
  (args: SendFunctionArgs): void;
}

export interface LLMEventStream extends LLMDataStream {
  stream: ReadableStream<Uint8Array>;
  toResponse: () => Response;
  close: () => void;
  createEventEmitter: () => LLMEventEmitter;
}

export function createEventStreamDataStream(
  signal?: AbortSignal
): LLMEventStream {
  const { stream, enqueue, close } = createReadableStream(signal);

  let send = (event: StreamMessage) => {
    let dataStr =
      typeof event.data === "number" ? event.data : JSON.stringify(event.data);
    enqueue(`event: ${event.type}\ndata:${dataStr}\n\n`);
  };

  const sendText = (text: string) => {
    send({ type: "content", data: text });
  };

  const sendLog = (message: string) => {
    send({ type: "log", data: message });
  };

  const sendError = (error: any) => {
    send({ type: "error", data: error });
  };

  const sendToolCall = (toolCall: ToolCall) => {
    send({ type: "tool_call", data: toolCall });
  };

  const sendToolResult = (toolResult: ToolResult) => {
    send({ type: "tool_result", data: toolResult });
  };

  const sendData = (data: JSONValue) => {
    send({ type: "data", data });
  };

  const createEventEmitter = () => {
    let emitter = new LLMEventEmitter();
    emitter.on("content", sendText);
    emitter.on("tool_call", sendToolCall);
    emitter.on("tool_result", sendToolResult);
    emitter.on("error", sendError);
    emitter.on("data", sendData);
    return emitter;
  };

  return {
    stream,
    toResponse: () =>
      new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }),
    close,
    sendText,
    sendLog,
    sendToolCall,
    sendToolResult,
    sendError,
    sendData,
    createEventEmitter,
  };
}
