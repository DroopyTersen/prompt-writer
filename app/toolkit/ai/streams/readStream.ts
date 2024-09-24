import { JSONValue } from "ai";
import {
  createParser,
  type ParsedEvent,
  type ReconnectInterval,
} from "eventsource-parser";
import { fetchStream } from "~/toolkit/http/fetch.utils";

export async function fetchTextStream(
  apiPath: string,
  input: any,
  onChunk: (chunk: string) => void,
  abortController?: AbortController
) {
  let response = await fetchStream(apiPath, {
    body: JSON.stringify(input),
  });

  return readTextStream(response, onChunk, abortController?.signal);
}

export async function fetchEventStream(
  apiPath: string,
  input: any,
  onEvent: (event: { event: string; data: JSONValue }) => void,
  abortController?: AbortController
) {
  let response = await fetchStream(apiPath, {
    body: JSON.stringify(input),
    signal: abortController?.signal,
  });
  return readEventStream(response, onEvent, abortController?.signal);
}

export async function readTextStream(
  response: Response,
  onText?: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!response.ok) {
    // Improved error message for HTTP errors, combining aspects from both versions.
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    // Early error detection for missing response body, as seen in Version A.
    throw new Error("Failed to get readable stream from Response body.");
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  const decoder = new TextDecoder();

  const handleAbort = () => {
    reader?.cancel("cancel"); // Attempt to cancel the stream reading if the fetch is aborted
  };
  try {
    reader =
      response.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
    signal?.addEventListener?.("abort", handleAbort);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || signal?.aborted) {
          break; // Exit the loop if done or if the fetch has been aborted.
        }
        const textChunk = decoder.decode(value);
        if (onText) onText(textChunk);
      }
    } catch (error: any) {
      // Stream reading error, reject the promise
      if (error?.name !== "AbortError") {
        throw new Error("Stream reading error: " + error?.message);
      }
    } finally {
      // Cleanup: Remove the abort event listener to avoid memory leaks
      signal?.removeEventListener?.("abort", handleAbort);

      // If the reader is locked (e.g., not yet closed), attempt to release it
      if (reader && response.body.locked) {
        await reader?.cancel?.().catch(() => {});
      }
    }
  } catch (error) {
    console.error("Fetch or stream error:", error);
    throw error;
  }
  return;
}

const tryParseEventDataJson = (data: string) => {
  if (
    (data &&
      typeof data === "string" &&
      (data.startsWith("{") || data.startsWith("["))) ||
    data.startsWith('"')
  ) {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error("🚀 | tryParseEventDataJson | error:", error);
      return data;
    }
  }
  return data;
};

export async function readEventStream(
  response: Response,
  onEvent: (event: { event: string; data: JSONValue }) => void,
  signal?: AbortSignal
) {
  function onParseEvent(event: ParsedEvent | ReconnectInterval) {
    if (event?.type === "event") {
      try {
        const data = event.data;
        if (data === "[DONE]") {
          return;
        }
        const json = tryParseEventDataJson(data);
        let payload = { event: event.event || "message", data: json };
        onEvent(payload);
      } catch (e) {
        console.error("🚀 | onParse | error", e);
      }
    }
  }
  const parser = createParser(onParseEvent);

  return readTextStream(response, parser.feed, signal);
}
