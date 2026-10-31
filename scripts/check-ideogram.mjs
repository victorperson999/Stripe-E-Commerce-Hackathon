import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildIdeogramRequest, getIdeogramKey, IDEOGRAM_ENDPOINT } from "../src/lib/server/ideogram.ts";
import { validatePosterInput } from "../src/lib/server/poster-prompts.ts";
import { POST } from "../src/app/api/posters/route.ts";

// Default: non-billable request validation and quote. --generate makes ONE paid call.
const args = process.argv.slice(2);
const style = args.find((arg) => arg.startsWith("--style="))?.slice(8) ?? "neon";
const input = validatePosterInput({
  title: "Builders After Dark", dateTimeText: "Friday, 7 PM", venue: "Toronto",
  description: "An evening for indie hackers to meet and share ideas.", style,
});

try {
  const key = getIdeogramKey();
  const response = await fetch(`${IDEOGRAM_ENDPOINT}?dry_run=true`, {
    method: "POST", headers: { "Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(buildIdeogramRequest(input)),
    signal: AbortSignal.timeout(30_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`Non-billable API check failed (HTTP ${response.status}).`);
  const quote = await response.json();
  const micros = Number(quote.usd_micros);
  if (quote.usd_micros == null || !Number.isSafeInteger(micros) || micros < 0) {
    throw new Error("The API did not return a recognized USD quote. No generation was attempted.");
  }
  const quotedUsd = micros / 1_000_000;
  console.log(JSON.stringify({ dryRun: "passed", quotedUsd, style }));
  if (args.includes("--generate")) {
    const cap = Number(args.find((arg) => arg.startsWith("--max-cost-usd="))?.slice(15));
    if (!Number.isFinite(cap) || cap <= 0 || quotedUsd > cap) {
      throw new Error("Supply --max-cost-usd=<amount> covering the quote. No generation was attempted.");
    }
    const start = Date.now();
    const generated = await POST(new Request("http://localhost/api/posters", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    }));
    const poster = await generated.json();
    if (!generated.ok) throw new Error(`Route check failed (HTTP ${generated.status}, ${poster.error?.code ?? "unknown"}).`);
    const bytes = Buffer.from(poster.imageDataUrl.split(",")[1], "base64");
    const directory = resolve(".backend-artifacts");
    await mkdir(directory, { recursive: true });
    const path = resolve(directory, `${style}-${poster.filename}`);
    await writeFile(path, bytes);
    console.log(JSON.stringify({ generation: "passed", routeStatus: generated.status, elapsedMs: Date.now() - start, bytes: bytes.length, mimeType: poster.mimeType, path }));
  }
} catch (error) {
  // Never print provider responses, request headers, URLs with signatures or stack traces.
  if (error.code) console.error(`Ideogram check failed: ${error.code}`);
  else if (error instanceof TypeError) console.error("Ideogram check failed: network request unavailable.");
  else console.error(error.message);
  process.exitCode = 1;
}
