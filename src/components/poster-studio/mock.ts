// TEMPORARY mock of POST /api/posters — draws a placeholder PNG on a canvas.
// Delete this file before deployment.
import type { PosterRequest, PosterSuccess } from "@/types/poster";
import { PosterRequestError } from "./errors";

const PALETTES = {
  neon: { bg: ["#12002b", "#3a0060"], title: "#ff2fa0", text: "#2de2ff" },
  retro: { bg: ["#f4e4c1", "#f0c27a"], title: "#c2410c", text: "#1f4f4b" },
  minimal: { bg: ["#fafafa", "#ececec"], title: "#111111", text: "#444444" },
} as const;

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "poster";
}

export async function mockGeneratePoster(request: PosterRequest): Promise<PosterSuccess> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Type "fail" as the title to preview the error state.
  if (request.title.trim().toLowerCase() === "fail") {
    throw new PosterRequestError("We could not generate your poster. Please try again.", "GENERATION_FAILED");
  }

  const width = 768;
  const height = 1152;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const palette = PALETTES[request.style];

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette.bg[0]);
  gradient.addColorStop(1, palette.bg[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.fillStyle = palette.text;
  ctx.font = "600 28px sans-serif";
  ctx.fillText("MOCK POSTER", width / 2, 90);

  ctx.fillStyle = palette.title;
  ctx.font = "800 72px sans-serif";
  wrapText(ctx, request.title.toUpperCase(), width / 2, height / 2 - 120, width - 120, 84);

  ctx.fillStyle = palette.text;
  ctx.font = "600 40px sans-serif";
  ctx.fillText(request.dateTimeText, width / 2, height - 220);
  ctx.font = "400 34px sans-serif";
  ctx.fillText(request.venue, width / 2, height - 165);

  return {
    imageDataUrl: canvas.toDataURL("image/png"),
    mimeType: "image/png",
    filename: `${slugify(request.title)}.png`,
  };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}
