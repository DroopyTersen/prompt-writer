export function createReadableStream(signal?: AbortSignal) {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  const encoder = new TextEncoder();

  // Define the abort event handler
  const handleAbort = () => {
    if (!closed) {
      console.log("Abort signal received, closing stream");
      close(); // Use the close function to cleanly close the stream
    }
  };

  const stream = new ReadableStream<Uint8Array>(
    {
      start(c) {
        controller = c;
        if (signal) {
          if (signal.aborted) {
            console.log(
              "Abort signal received before stream start, closing stream"
            );
            closed = true; // Mark as closed to prevent further operations
            c.close(); // Close the stream controller directly since close() relies on controller being set
            return;
          }
          signal.addEventListener("abort", handleAbort);
        }
      },
      pull: (ctrl) => {
        // No-op: we don't need to do anything special on pull
      },
      cancel() {
        console.log("Stream canceled");
        closed = true;
        // Remove the abort event listener on stream cancel to avoid memory leaks
        if (signal) {
          signal.removeEventListener("abort", handleAbort);
        }
      },
    },
    { highWaterMark: 1, size: (chunk) => chunk?.length || 0 }
  );

  const enqueue = (chunk: string) => {
    if (closed || !controller) {
      console.log("Stream closed, cannot enqueue");
      return;
    }
    // Try-catch block added to gracefully handle errors during chunk encoding or enqueueing
    try {
      controller.enqueue(encoder.encode(chunk));
    } catch (error) {
      console.error("Error during chunk encoding or enqueueing:", error);
      // Consider closing the stream on certain errors or simply log the error based on your error strategy
    }
  };

  const close = () => {
    if (closed || !controller) {
      console.log("Stream already closed");
      return;
    }
    controller.close();
    closed = true;
    // Cleanup: Remove the abort event listener to avoid memory leaks
    if (signal) {
      signal.removeEventListener("abort", handleAbort);
    }
  };

  return { stream, enqueue, close, isClosed: closed };
}
