// Shared contract for POST /api/posters. Agreed in idea.md — change only together.

export const POSTER_STYLES = ["neon", "retro", "minimal"] as const;
export type PosterStyle = (typeof POSTER_STYLES)[number];

export const POSTER_LIMITS = {
  title: 80,
  dateTimeText: 80,
  venue: 120,
  description: 400,
} as const;

export interface PosterRequest {
  /** Required; trimmed; 1–80 characters. */
  title: string;
  /** Required; trimmed; 1–80 characters; displayed as supplied. */
  dateTimeText: string;
  /** Required; trimmed; 1–120 characters. */
  venue: string;
  /** Optional; at most 400 characters. */
  description?: string;
  style: PosterStyle;
}

export type PosterMimeType = "image/png" | "image/jpeg" | "image/webp";

/** HTTP 200 */
export interface PosterSuccess {
  /** `data:<mimeType>;base64,...` */
  imageDataUrl: string;
  mimeType: PosterMimeType;
  /** e.g. "builders-after-dark.png" — extension matches mimeType. */
  filename: string;
}

export type PosterErrorCode =
  | "INVALID_INPUT" // 400
  | "RATE_LIMITED" // 429
  | "GENERATION_FAILED" // 502
  | "NOT_CONFIGURED" // 503
  | "GENERATION_TIMEOUT"; // 504

/** Any non-200 response */
export interface PosterError {
  error: {
    code: PosterErrorCode;
    /** Safe to show to the user. Never contains credentials or raw provider output. */
    message: string;
  };
}
