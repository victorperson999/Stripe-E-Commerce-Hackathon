import { Buffer } from "node:buffer";
import { readBoundedBody } from "./poster-bytes";
import { PosterError, generationFailed, generationTimeout } from "./poster-errors";
import { buildPosterPrompt, type PosterInput } from "./poster-prompts";

export const IDEOGRAM_ENDPOINT = "https://api.ideogram.ai/v2/image/generate/ideogram-3";
export const MAX_IMAGE_BYTES = 3_000_000;
const MAX_METADATA_BYTES = 64 * 1024;

export interface PosterResult {
  imageDataUrl: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  filename: string;
}

interface GenerateOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  generationTimeoutMs?: number;
  downloadTimeoutMs?: number;
}

export function getIdeogramKey(): string {
  const key = process.env.IDEOGRAM_API_KEY?.trim() || process.env.IDEOGRAM_KEY?.trim();
  if (!key) {
    throw new PosterError("NOT_CONFIGURED", "Poster generation is not configured yet.");
  }
  return key;
}

export function buildIdeogramRequest(input: PosterInput) {
  return {
    prompt: buildPosterPrompt(input),
    negative_prompt: "field labels, description text, extra words, repeated text, gibberish, watermark, poster mockup",
    aspect_ratio: "2x3",
    rendering_speed: "default",
    magic_prompt: "off",
    style_type: "design",
    num_images: 1,
    async: false,
  };
}

function checkProviderStatus(status: number): void {
  if (status >= 200 && status < 300) return;
  if (status === 429) {
    throw new PosterError("RATE_LIMITED", "Poster generation is busy. Please try again in a minute.");
  }
  if ([401, 402, 403].includes(status)) {
    throw new PosterError("NOT_CONFIGURED", "Poster generation is temporarily unavailable. Please contact the demo host.");
  }
  if (status === 408 || status === 504) throw generationTimeout();
  throw generationFailed();
}

function imageUrl(payload: unknown): URL {
  if (!payload || typeof payload !== "object" || !("data" in payload)) throw generationFailed();
  const data = payload.data;
  if (!Array.isArray(data) || data.length !== 1) throw generationFailed();
  const image = data[0];
  if (!image || typeof image !== "object" || typeof image.url !== "string") throw generationFailed();
  if (image.is_image_safe === false) {
    throw new PosterError("GENERATION_FAILED", "This poster could not be generated. Please try a different event description.");
  }
  const url = new URL(image.url);
  // Only retrieve provider-owned HTTPS images; never proxy a client-supplied URL.
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") ||
      !(url.hostname === "ideogram.ai" || url.hostname.endsWith(".ideogram.ai"))) {
    throw generationFailed();
  }
  return url;
}

function detectImage(bytes: Buffer): { mimeType: PosterResult["mimeType"]; extension: string } {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      bytes.toString("ascii", 12, 16) === "IHDR") {
    return { mimeType: "image/png", extension: "png" };
  }
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 16 && bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  throw new PosterError("GENERATION_FAILED", "The image service returned an unsupported image. Please try again.");
}

export async function generatePoster(input: PosterInput, options: GenerateOptions = {}): Promise<PosterResult> {
  const apiKey = options.apiKey?.trim() || getIdeogramKey();
  const fetchImpl = options.fetchImpl ?? fetch;
  let activeSignal = AbortSignal.any([
    AbortSignal.timeout(options.generationTimeoutMs ?? 90_000),
    ...(options.signal ? [options.signal] : []),
  ]);
  try {
    activeSignal.throwIfAborted();
    const response = await fetchImpl(IDEOGRAM_ENDPOINT, {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildIdeogramRequest(input)),
      signal: activeSignal,
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      checkProviderStatus(response.status);
    }
    const metadata = await readBoundedBody(response.body, MAX_METADATA_BYTES, activeSignal, generationFailed);
    const url = imageUrl(JSON.parse(metadata.toString("utf8")));

    activeSignal = AbortSignal.any([
      AbortSignal.timeout(options.downloadTimeoutMs ?? 15_000),
      ...(options.signal ? [options.signal] : []),
    ]);
    // Deliberately omit the API key when downloading an image, and reject redirects.
    const image = await fetchImpl(url, {
      signal: activeSignal, redirect: "error", cache: "no-store",
    });
    const tooLarge = () => new PosterError("GENERATION_FAILED", "The generated image is too large to download. Please try again.");
    if (!image.ok || Number(image.headers.get("content-length")) > MAX_IMAGE_BYTES) {
      void image.body?.cancel().catch(() => {});
      if (!image.ok) throw generationFailed();
      throw tooLarge();
    }
    const bytes = await readBoundedBody(image.body, MAX_IMAGE_BYTES, activeSignal, tooLarge);
    const { mimeType, extension } = detectImage(bytes);
    const declaredMime = image.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (declaredMime && declaredMime !== "application/octet-stream" && declaredMime !== mimeType) {
      throw generationFailed();
    }
    const slug = input.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-$/, "") || "event-poster";
    return { imageDataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`, mimeType, filename: `${slug}.${extension}` };
  } catch (error) {
    if (activeSignal.aborted) throw generationTimeout();
    if (error instanceof PosterError) throw error;
    throw generationFailed();
  }
}
