import type { PosterStyle } from "@/types/poster";

export interface StyleOption {
  id: PosterStyle;
  name: string;
  tagline: string;
  /** CSS background for the style card swatch. */
  swatch: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: "neon",
    name: "Neon Nightlife",
    tagline: "Glowing signs, deep shadows, after-dark energy.",
    swatch: "linear-gradient(135deg, #12002b 0%, #ff2fa0 55%, #2de2ff 100%)",
  },
  {
    id: "retro",
    name: "Retro Print",
    tagline: "Warm halftones and bold vintage type.",
    swatch: "linear-gradient(135deg, #f4e4c1 0%, #f08a3c 55%, #1f6f6b 100%)",
  },
  {
    id: "minimal",
    name: "Minimal Editorial",
    tagline: "Clean grids, generous space, sharp type.",
    swatch: "linear-gradient(135deg, #fafafa 0%, #d9d9d9 60%, #111111 100%)",
  },
];
