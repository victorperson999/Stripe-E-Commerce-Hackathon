export type PosterErrorCode =
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "GENERATION_TIMEOUT"
  | "GENERATION_FAILED";

const statuses: Record<PosterErrorCode, number> = {
  INVALID_INPUT: 400,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 503,
  GENERATION_TIMEOUT: 504,
  GENERATION_FAILED: 502,
};

// Only pass application-authored messages here, never upstream error text.
export class PosterError extends Error {
  readonly code: PosterErrorCode;
  readonly status: number;

  constructor(code: PosterErrorCode, message: string) {
    super(message);
    this.name = "PosterError";
    this.code = code;
    this.status = statuses[code];
  }
}

export function generationFailed(): PosterError {
  return new PosterError(
    "GENERATION_FAILED",
    "We could not generate your poster. Please try again.",
  );
}

export function generationTimeout(): PosterError {
  return new PosterError(
    "GENERATION_TIMEOUT",
    "The poster request timed out. Please wait before trying again; generation may still finish.",
  );
}
