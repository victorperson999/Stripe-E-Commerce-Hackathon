import type { PosterStyle } from "@/types/poster";

export interface StyleOption {
  id: PosterStyle;
  name: string;
  tagline: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: "neon",
    name: "Neon Nightlife",
    tagline: "Electric. After dark.",
  },
  {
    id: "retro",
    name: "Retro Print",
    tagline: "Warm ink. Bold type.",
  },
  {
    id: "minimal",
    name: "Minimal Editorial",
    tagline: "Less, but considered.",
  },
];
