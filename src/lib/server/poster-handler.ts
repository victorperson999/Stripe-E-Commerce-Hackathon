import { readBoundedBody } from "./poster-bytes";
import { generatePoster, getIdeogramKey } from "./ideogram";
import { PosterError, generationFailed } from "./poster-errors";
import { validatePosterInput } from "./poster-prompts";

// Best-effort protection for each server process, NOT a distributed spending cap.
export function createDemoLimiter(now: () => number = Date.now) {
  let starts: number[] = [];
  let active = 0;
  return () => {
    const time = now();
    starts = starts.filter((started) => time - started < 60_000);
    if (active >= 2 || starts.length >= 6) {
      throw new PosterError("RATE_LIMITED", "Poster generation is busy. Please try again in a minute.");
    }
    starts.push(time);
    active += 1;
    let released = false;
    return () => {
      if (!released) { active -= 1; released = true; }
    };
  };
}

export function createPosterHandler(dependencies: {
  generate?: typeof generatePoster;
  getKey?: typeof getIdeogramKey;
  acquire?: ReturnType<typeof createDemoLimiter>;
} = {}) {
  const generate = dependencies.generate ?? generatePoster;
  const getKey = dependencies.getKey ?? getIdeogramKey;
  const acquire = dependencies.acquire ?? createDemoLimiter();
  return async (request: Request): Promise<Response> => {
    let release: (() => void) | undefined;
    try {
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        throw new PosterError("INVALID_INPUT", "Send the event with Content-Type: application/json.");
      }
      const invalidBody = () => new PosterError("INVALID_INPUT", "The event request is too large.");
      if (Number(request.headers.get("content-length")) > 8192) throw invalidBody();
      let value: unknown;
      try {
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]);
        const body = await readBoundedBody(request.body, 8192, signal, invalidBody);
        value = JSON.parse(body.toString("utf8"));
      } catch (error) {
        if (error instanceof PosterError) throw error;
        throw new PosterError("INVALID_INPUT", "Send a complete, valid JSON event request.");
      }
      const input = validatePosterInput(value);
      const apiKey = getKey();
      release = acquire();
      const result = await generate(input, { apiKey, signal: request.signal });
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const safeError = error instanceof PosterError ? error : generationFailed();
      return Response.json({ error: { code: safeError.code, message: safeError.message } }, {
        status: safeError.status,
        headers: {
          "Cache-Control": "no-store",
          ...(safeError.code === "RATE_LIMITED" ? { "Retry-After": "60" } : {}),
        },
      });
    } finally {
      release?.();
    }
  };
}
