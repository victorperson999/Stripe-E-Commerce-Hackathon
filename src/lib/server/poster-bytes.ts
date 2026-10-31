import { Buffer } from "node:buffer";

// Read incrementally: Content-Length may be absent or incorrect.
export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  signal: AbortSignal,
  tooLarge: () => Error,
): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw tooLarge();
      chunks.push(value);
    }
    return Buffer.concat(chunks, total);
  } finally {
    signal.removeEventListener("abort", abort);
    // Cancel unread data on errors without waiting for an uncooperative source.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
