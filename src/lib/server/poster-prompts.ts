import { PosterError } from "./poster-errors";

export type PosterStyle = "neon" | "retro" | "minimal";

// Structural wire contract from idea.md. No frontend/scaffold dependency.
export interface PosterInput {
  title: string;
  dateTimeText: string;
  venue: string;
  description?: string;
  style: PosterStyle;
}

const styles: Record<PosterStyle, string> = {
  neon: "Neon Nightlife: dark midnight background, electric cyan and magenta lighting, luminous geometric accents, bold modern display lettering, high contrast.",
  retro: "Retro Print: warm cream paper, orange and muted teal ink, subtle screen-print grain, playful vintage shapes, bold nostalgic display lettering.",
  minimal: "Minimal Editorial: generous negative space, restrained black and ivory palette with one accent color, precise typographic grid, refined editorial lettering.",
};

export function validatePosterInput(value: unknown): PosterInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PosterError("INVALID_INPUT", "Send an event as a JSON object.");
  }
  const input = value as Record<string, unknown>;
  const required = (field: string, label: string, max: number): string => {
    const raw = input[field];
    if (typeof raw !== "string" || !raw.trim() || raw.trim().length > max) {
      throw new PosterError("INVALID_INPUT", `${label} must contain 1–${max} characters.`);
    }
    return raw.trim();
  };
  const title = required("title", "Event title", 80);
  const dateTimeText = required("dateTimeText", "Date and time", 80);
  const venue = required("venue", "Venue", 120);
  if (input.description !== undefined &&
      (typeof input.description !== "string" || input.description.length > 400)) {
    throw new PosterError("INVALID_INPUT", "Description must be text of at most 400 characters.");
  }
  if (input.style !== "neon" && input.style !== "retro" && input.style !== "minimal") {
    throw new PosterError("INVALID_INPUT", "Choose neon, retro, or minimal as the poster style.");
  }
  return {
    title, dateTimeText, venue, style: input.style,
    description: typeof input.description === "string" ? input.description.trim() : "",
  };
}

export function buildPosterPrompt(input: PosterInput): string {
  return [
    `A polished portrait event poster with a large headline reading ${JSON.stringify(input.title)}. Below the headline, two clearly legible lines read ${JSON.stringify(input.dateTimeText)} and ${JSON.stringify(input.venue)}.`,
    styles[input.style],
    input.description ? `Artwork theme (visual context only, not printed copy): ${input.description}` : "",
    "Balanced composition, generous margins, three text blocks only. Print only the three quoted strings, without quotation marks. No field labels or other lettering. Full-bleed artwork, no mockup.",
  ].filter(Boolean).join("\n");
}
