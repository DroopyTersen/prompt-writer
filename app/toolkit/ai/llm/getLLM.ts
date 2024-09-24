import {
  generateId,
  GenerateObjectResult,
  generateObject as vercelGenerateObject,
  generateText as vercelGenerateText,
  streamObject as vercelStreamObject,
  streamText as vercelStreamText,
} from "ai";
import { z } from "zod";
import { LLMEventEmitter } from "../streams/LLMEventEmitter";
import { MODEL_PROVIDERS, ModelProvider } from "./modelProviders";
import { AsyncReturnType, Prettify } from "../utils/typescript.utils";

export type LLM = ReturnType<typeof getLLM>;

export const getLLM = <T extends ModelProvider>(
  provider: T,
  modelName: keyof (typeof MODEL_PROVIDERS)[T]["models"]
) => {
  let _model = MODEL_PROVIDERS[provider].create(modelName as string, {
    cacheControl: true,
  });

  return {
    _model,
    generateText: async (
      params: GenerateTextParams,
      asyncOptions?: AsyncOptions
    ) => {
      return _generateText({ ...params, model: _model }, asyncOptions);
    },
    generateData: async <TSchema extends z.ZodTypeAny>(
      params: GenerateDataParams<TSchema>,
      asyncOptions?: AsyncOptions
    ) => {
      return _generateData({ ...params, model: _model }, asyncOptions);
    },
    streamText: async (
      params: StreamTextParams,
      asyncOptions?: AsyncOptions
    ) => {
      return _streamText({ ...params, model: _model }, asyncOptions);
    },
    runTools: async (
      params: StreamTextParams & { maxLoops?: number },
      asyncOptions?: AsyncOptions
    ) => {
      return _streamTextWithTools({ ...params, model: _model }, asyncOptions);
    },
    streamData: async <TSchema extends z.ZodType>(
      params: StreamDataParams<TSchema>,
      asyncOptions?: AsyncOptions
    ) => {
      return _streamData({ ...params, model: _model }, asyncOptions);
    },
  };
};

export type AsyncOptions = {
  signal?: AbortSignal;
  emitter?: LLMEventEmitter;
};
export type GenerateTextParams = Prettify<
  Omit<Parameters<typeof vercelGenerateText>[0], "model"> & {
    label?: string;
  }
>;

export type GenerateDataParams<T extends z.ZodTypeAny> = Prettify<
  Omit<
    Parameters<typeof vercelGenerateObject>[0],
    "model" | "schema" | "output"
  > & {
    schema: T;
    label?: string;
  }
>;

export type StreamTextParams = Prettify<
  Omit<Parameters<typeof vercelStreamText>[0], "model"> & {
    label?: string;
  }
>;

export type StreamDataParams<T extends z.ZodType> = Prettify<
  Omit<Parameters<typeof vercelStreamObject>[0], "model"> & {
    schema: T;
    label?: string;
  }
>;

const _generateText = async (
  params: Parameters<typeof vercelGenerateText>[0] & { label?: string },
  asyncOptions?: AsyncOptions
) => {
  const { signal, emitter } = asyncOptions || {};
  let requestId = generateId(12);
  emitter?.emit("llm_start", { requestId, ...params });

  let result = await vercelGenerateText({
    ...params,
    abortSignal: signal,
  });
  emitter?.emit("llm_end", { requestId, ...result });

  return result;
};

export type VercelChatParams =
  | Parameters<typeof vercelGenerateObject>[0]
  | Parameters<typeof vercelStreamText>[0]
  | Parameters<typeof vercelStreamObject>[0]
  | Parameters<typeof vercelGenerateText>[0];

export type VercelChatResult = Prettify<
  Partial<
    Omit<StreamDataResult, "rawResponse"> &
      Omit<StreamTextResult, "rawResponse"> &
      Omit<AsyncReturnType<typeof _generateData>, "rawResponse"> &
      Omit<AsyncReturnType<typeof _generateText>, "rawResponse">
  >
>;

export type VercelUsage = GenerateObjectResult<any>["usage"];

export const _generateData = async <TSchema extends z.ZodTypeAny>(
  params: Omit<
    Parameters<typeof vercelGenerateObject>[0],
    "schema" | "output"
  > & {
    schema: TSchema;
    label?: string;
  },
  asyncOptions?: AsyncOptions
) => {
  const { signal, emitter } = asyncOptions || {};
  let requestId = generateId(12);
  emitter?.emit("llm_start", {
    requestId,
    ...params,
  });
  let { rawResponse, ...result } = await vercelGenerateObject({
    ...params,
    abortSignal: signal,
  });
  emitter?.emit("llm_end", { requestId, ...result });

  return result as Omit<
    AsyncReturnType<typeof vercelGenerateObject>,
    "object"
  > & { object: z.infer<TSchema> };
};

type StreamTextResult = NonNullable<
  Parameters<typeof vercelStreamText>[0]["onFinish"]
> extends (event: infer E) => any
  ? E
  : never;

const _streamText = async (
  params: Parameters<typeof vercelStreamText>[0] & { label?: string },
  asyncOptions?: AsyncOptions
): Promise<StreamTextResult> => {
  const { signal, emitter } = asyncOptions || {};
  let requestId = generateId(12);

  return new Promise(async (resolve, reject) => {
    emitter?.emit("llm_start", { requestId, ...params });
    try {
      const stream = await vercelStreamText({
        abortSignal: signal,
        ...params,
        onFinish: (result) => {
          if (result.toolCalls) {
            for (const toolCall of result.toolCalls) {
              emitter?.emit("tool_call", {
                id: toolCall.toolCallId,
                name: toolCall.toolName,
                args: toolCall.args,
                timestamp: Date.now(),
              });
            }
          }
          emitter?.emit("llm_end", { requestId, ...result });
          resolve(result);
        },
      });

      for await (const chunk of stream.textStream) {
        emitter?.emit("content", chunk);
      }
    } catch (err: any) {
      console.error("🚀 | streamText err:", err);
      emitter?.emit("error", err);
      reject(err);
    }
  });
};

type StreamDataResult = NonNullable<
  Parameters<typeof vercelStreamObject>[0]["onFinish"]
> extends (event: infer E) => any
  ? E
  : never;

const _streamData = async <TSchema extends z.ZodType>(
  params: Parameters<typeof vercelStreamObject>[0] & {
    schema: TSchema;
    label?: string;
  },
  asyncOptions?: AsyncOptions
): Promise<StreamDataResult> => {
  const { signal, emitter } = asyncOptions || {};
  let requestId = generateId(12);

  return new Promise(async (resolve, reject) => {
    emitter?.emit("llm_start", { requestId, ...params });
    try {
      const stream = await vercelStreamObject<z.infer<TSchema>>({
        abortSignal: signal,
        // @ts-ignore
        output: "object",
        ...params,
        onFinish: (result) => {
          if (result.object) {
            emitter?.emit("data", result.object);
          }
          emitter?.emit("llm_end", { requestId, ...result });
          resolve(result);
        },
      });

      for await (const partialObject of stream.partialObjectStream) {
        // @ts-ignore
        emitter?.emit(
          "partial_data",
          // @ts-ignore
          partialObject
        );
      }
    } catch (err: any) {
      console.error("🚀 | streamData err:", err);
      emitter?.emit("error", err);
      reject(err);
    }
  });
};

const _streamTextWithTools = async (
  params: Parameters<typeof vercelStreamText>[0] & { maxLoops?: number },
  asyncOptions?: AsyncOptions
): Promise<StreamTextResult> => {
  const { signal, emitter } = asyncOptions || {};
  let messages = [...(params.messages || [])];
  let loopCount = 0;
  const maxLoops = params.maxLoops || 5;
  let requestId = generateId(12);

  return new Promise(async (resolve, reject) => {
    emitter?.emit("llm_start", { requestId, ...params });

    const attemptStream = async (retryCount = 0): Promise<void> => {
      try {
        let finalContent = "";
        const stream = await vercelStreamText({
          ...params,
          messages,
          maxRetries: 1,
          abortSignal: signal,
          onFinish: async (result) => {
            emitter?.emit("llm_end", { requestId, ...result });
            if (
              result.toolCalls &&
              result.toolCalls.length > 0 &&
              loopCount < maxLoops
            ) {
              // Add the assistant message with tool calls

              // Wait for tool results before proceeding
              if (result.toolResults) {
                const assistantMessage = {
                  role: "assistant" as const,
                  content: result.toolCalls
                    .filter(
                      (toolCall) =>
                        result.toolResults &&
                        result.toolResults.some(
                          (r: any) => r.toolCallId === toolCall.toolCallId
                        )
                    )
                    .map((toolCall) => ({
                      type: "tool-call" as const,
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      args: toolCall.args,
                    })),
                };

                if (assistantMessage.content.length > 0) {
                  messages.push(assistantMessage);
                }

                if (result.toolResults && result.toolResults.length > 0) {
                  const toolResultMessage = {
                    role: "tool" as const,
                    content: result.toolResults.map((r: any) => ({
                      type: "tool-result" as const,
                      toolCallId: r.toolCallId,
                      toolName: r.toolName,
                      result: r.result,
                    })),
                  };

                  messages.push(toolResultMessage);

                  result.toolResults.forEach((r: any) => {
                    emitter?.emit("tool_result", {
                      toolCallId: r.toolCallId,
                      toolName: r.toolName,
                      result: r.result,
                      toolDefinitionId: r.toolName,
                    });
                  });
                }
              } else {
                // If no tool results, don't add the assistant message
                console.warn("Tool calls present but no tool results received");
              }

              loopCount++;

              // Recursive call with updated messages
              const nextResult = await _streamTextWithTools(
                { ...params, messages, maxLoops: maxLoops - 1 },
                asyncOptions
              );
              resolve({
                ...nextResult,
                toolCalls: [
                  ...(result.toolCalls || []),
                  ...(nextResult.toolCalls || []),
                ],
                toolResults: [
                  ...(result.toolResults || []),
                  ...(nextResult.toolResults || []),
                ],
              });
            } else {
              emitter?.emit("final_content", finalContent);
              resolve(result);
            }
          },
        });

        for await (const chunk of stream.fullStream) {
          if (chunk.type === "text-delta") {
            finalContent += chunk.textDelta;
            emitter?.emit("content", chunk.textDelta);
          } else if (chunk.type === "tool-call") {
            emitter?.emit("tool_call", {
              id: chunk.toolCallId,
              name: chunk.toolName,
              args: chunk.args,
              timestamp: Date.now(),
            });
          }
        }
      } catch (err: any) {
        console.log("🚀 | attemptStream | err:", err);
        if (
          err.name === "RetryError" &&
          err.errors &&
          err.errors[0] &&
          err.errors[0].statusCode === 429
        ) {
          if (retryCount < 3) {
            emitter?.emit(
              "log",
              `Rate limit exceeded. Retrying in 4.5 seconds... (Attempt ${
                retryCount + 1
              })`
            );
            console.log(
              `Rate limit exceeded. Retrying in 4.5 seconds... (Attempt ${
                retryCount + 1
              })`
            );
            await new Promise((resolve) => setTimeout(resolve, 4500));
            return attemptStream(retryCount + 1);
          }
        }
        throw err;
      }
    };

    try {
      await attemptStream();
    } catch (err: any) {
      console.error("🚀 | streamTextWithTools err:", err);
      emitter?.emit("error", err);
      reject(err);
    }
  });
};

export type LLMMessageTextContent = {
  type: "text";
  text: string;
};

export const getCachedMessageContent = (content: string) => {
  return {
    type: "text" as const,
    text: content,
    experimental_providerMetadata: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  } as {
    type: "text";
    text: string;
  };
};
