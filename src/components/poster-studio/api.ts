import type { PosterError, PosterRequest, PosterSuccess } from "@/types/poster";
import { PosterRequestError } from "./errors";
import { mockGeneratePoster } from "./mock";

// TEMPORARY: set NEXT_PUBLIC_POSTER_MOCK=1 in .env.local to develop without the backend.
// Remove the mock (and this flag) before deploying.
const USE_MOCK = process.env.NEXT_PUBLIC_POSTER_MOCK === "1";

const FALLBACK_MESSAGE = "We could not generate your poster. Please try again.";

export async function generatePoster(request: PosterRequest): Promise<PosterSuccess> {
  if (USE_MOCK) return mockGeneratePoster(request);

  let response: Response;
  try {
    response = await fetch("/api/posters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new PosterRequestError("Network error — check your connection and try again.", "NETWORK");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (body as PosterError | null)?.error?.message ?? FALLBACK_MESSAGE;
    const code = (body as PosterError | null)?.error?.code ?? "GENERATION_FAILED";
    throw new PosterRequestError(message, code);
  }

  const success = body as PosterSuccess | null;
  if (!success?.imageDataUrl?.startsWith("data:image/")) {
    throw new PosterRequestError(FALLBACK_MESSAGE, "GENERATION_FAILED");
  }
  return success;
}

/** Turns the data URL into a Blob download so it works without cross-origin URLs. */
export async function downloadPoster(poster: PosterSuccess) {
  const blob = await (await fetch(poster.imageDataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = poster.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
