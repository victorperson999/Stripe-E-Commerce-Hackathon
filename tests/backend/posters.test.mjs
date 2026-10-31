import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { validatePosterInput, buildPosterPrompt } from "../../src/lib/server/poster-prompts.ts";
import { generatePoster, getIdeogramKey, MAX_IMAGE_BYTES, IDEOGRAM_ENDPOINT } from "../../src/lib/server/ideogram.ts";
import { PosterError } from "../../src/lib/server/poster-errors.ts";
import { createPosterHandler, createDemoLimiter } from "../../src/lib/server/poster-handler.ts";
import { POST, runtime, maxDuration } from "../../src/app/api/posters/route.ts";

const event = {
  title: "Builders After Dark", dateTimeText: "Friday, 7 PM", venue: "Toronto",
  description: "An evening for indie hackers to meet and share ideas.", style: "neon",
};
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=", "base64");
const sampleResult = { imageDataUrl: `data:image/png;base64,${png.toString("base64")}`, mimeType: "image/png", filename: "builders-after-dark.png" };
const providerResult = (overrides = {}) => Response.json({ data: [{ url: "https://ideogram.ai/api/images/ephemeral/example.png", is_image_safe: true, ...overrides }] });
const request = (body = event, headers = {}) => new Request("http://localhost/api/posters", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});
const errorCode = (code) => (error) => error instanceof PosterError && error.code === code;

test("validation trims required text and preserves display date and Unicode", () => {
  assert.deepEqual(validatePosterInput({ ...event, title: "  夜の会 🎉  ", dateTimeText: "  Friday, 7 PM  " }), {
    ...event, title: "夜の会 🎉", dateTimeText: "Friday, 7 PM",
  });
  assert.equal(validatePosterInput({ ...event, description: undefined }).description, "");
  validatePosterInput({ ...event, title: "x".repeat(80), dateTimeText: "x".repeat(80), venue: "x".repeat(120), description: "x".repeat(400) });
});

test("validation rejects malformed shapes, incorrect types, whitespace and overlong values", () => {
  const cases = [null, [], "event", 42, {},
    { ...event, title: "  " }, { ...event, title: 12 }, { ...event, title: "x".repeat(81) },
    { ...event, dateTimeText: "x".repeat(81) }, { ...event, venue: "x".repeat(121) },
    { ...event, description: null }, { ...event, description: {} }, { ...event, description: "x".repeat(401) },
    { ...event, style: "constructor" }, { ...event, style: "NEON" }, { ...event, style: null }];
  for (const value of cases) assert.throws(() => validatePosterInput(value), errorCode("INVALID_INPUT"));
});

test("each style has a distinct prompt with exact event data and context-only description", () => {
  const prompts = ["neon", "retro", "minimal"].map((style) => buildPosterPrompt({ ...event, style }));
  assert.equal(new Set(prompts).size, 3);
  for (const prompt of prompts) {
    for (const text of [event.title, event.dateTimeText, event.venue]) assert.ok(prompt.includes(JSON.stringify(text)));
    assert.ok(prompt.includes("visual context only"));
    assert.ok(prompt.includes("No field labels"));
  }
});

test("generation requests exactly one portrait and returns matching image bytes and filename", async () => {
  const calls = [];
  const result = await generatePoster(event, { apiKey: "test-secret", fetchImpl: async (url, init) => {
    calls.push({ url: String(url), init });
    return calls.length === 1 ? providerResult() : new Response(png, { headers: { "Content-Type": "image/png" } });
  } });
  assert.deepEqual(result, sampleResult);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, IDEOGRAM_ENDPOINT);
  assert.equal(calls[0].init.headers["Api-Key"], "test-secret");
  assert.deepEqual({ ...JSON.parse(calls[0].init.body), prompt: undefined }, {
    prompt: undefined, negative_prompt: "field labels, description text, extra words, repeated text, gibberish, watermark, poster mockup", aspect_ratio: "2x3", rendering_speed: "default", magic_prompt: "off", style_type: "design", num_images: 1, async: false,
  });
  assert.equal(calls[1].init.headers, undefined);
  assert.equal(calls[1].init.redirect, "error");
  assert.ok(!JSON.stringify(result).includes("test-secret"));
});

test("provider statuses map to the stable contract without retries or raw diagnostics", async () => {
  for (const [status, code] of [[401, "NOT_CONFIGURED"], [402, "NOT_CONFIGURED"], [403, "NOT_CONFIGURED"], [429, "RATE_LIMITED"], [408, "GENERATION_TIMEOUT"], [504, "GENERATION_TIMEOUT"], [422, "GENERATION_FAILED"], [500, "GENERATION_FAILED"]]) {
    let calls = 0;
    await assert.rejects(generatePoster(event, { apiKey: "test", fetchImpl: async () => {
      calls++; return new Response("SECRET upstream diagnostic", { status });
    } }), (error) => errorCode(code)(error) && !error.message.includes("SECRET"));
    assert.equal(calls, 1);
  }
});

test("unsafe, malformed, foreign and private image URLs never trigger a download", async () => {
  for (const overrides of [
    { is_image_safe: false }, { url: null }, { url: "not a URL" },
    { url: "http://ideogram.ai/image.png" }, { url: "https://127.0.0.1/image.png" },
    { url: "https://ideogram.ai.attacker.example/image.png" }, { url: "https://example.com/image.png" },
    { url: "https://user:secret@ideogram.ai/image.png" }, { url: "https://ideogram.ai:8443/image.png" },
  ]) {
    let calls = 0;
    await assert.rejects(generatePoster(event, { apiKey: "test", fetchImpl: async () => {
      calls++; return providerResult(overrides);
    } }), errorCode("GENERATION_FAILED"));
    assert.equal(calls, 1);
  }
});

test("malformed, missing, extra or oversized provider metadata fails safely", async () => {
  for (const body of ["not json", "null", "{}", '{"data":[]}', '{"data":[{},{}]}', "x".repeat(65_537)]) {
    await assert.rejects(generatePoster(event, { apiKey: "test", fetchImpl: async () => new Response(body) }), errorCode("GENERATION_FAILED"));
  }
});

test("download size cap works with and without an honest Content-Length", async () => {
  for (const declaredLength of [String(MAX_IMAGE_BYTES + 1), "1", undefined]) {
    let calls = 0;
    let canceled = false;
    await assert.rejects(generatePoster(event, { apiKey: "test", fetchImpl: async () => {
      if (++calls === 1) return providerResult();
      const stream = new ReadableStream({
        start(controller) { controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES + 1)); },
        cancel() { canceled = true; },
      });
      return new Response(stream, { headers: declaredLength ? { "Content-Length": declaredLength } : {} });
    } }), errorCode("GENERATION_FAILED"));
    assert.equal(canceled, true);
  }
});

test("image formats are detected from bytes and conflicting content types are rejected", async () => {
  const jpeg = Buffer.from([255, 216, 255, 224, 0, 16, 255, 217]);
  const webp = Buffer.from("RIFF0000WEBPVP8 ");
  for (const [bytes, declared, mimeType, extension] of [
    [png, "image/png", "image/png", "png"], [jpeg, "image/jpeg", "image/jpeg", "jpg"],
    [webp, "application/octet-stream", "image/webp", "webp"],
  ]) {
    let calls = 0;
    const result = await generatePoster({ ...event, title: "../../夜" }, { apiKey: "test", fetchImpl: async () =>
      ++calls === 1 ? providerResult() : new Response(bytes, { headers: { "Content-Type": declared } }),
    });
    assert.equal(result.mimeType, mimeType);
    assert.equal(result.filename, `event-poster.${extension}`);
  }
  for (const [bytes, type] of [[png, "image/jpeg"], [Buffer.from("<html>error</html>"), "image/png"], [Buffer.alloc(0), "image/png"]]) {
    let calls = 0;
    await assert.rejects(generatePoster(event, { apiKey: "test", fetchImpl: async () =>
      ++calls === 1 ? providerResult() : new Response(bytes, { headers: { "Content-Type": type } }),
    }), errorCode("GENERATION_FAILED"));
  }
});

test("generation and stalled image bodies time out, and canceled clients never start generation", async () => {
  const waitingFetch = async (_url, { signal }) => {
    await delay(1000, null, { signal }); return providerResult();
  };
  await assert.rejects(generatePoster(event, { apiKey: "test", generationTimeoutMs: 5, fetchImpl: waitingFetch }), errorCode("GENERATION_TIMEOUT"));
  let calls = 0;
  let canceled = false;
  // Keep the event loop alive while AbortSignal.timeout's unref'ed timer runs.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await assert.rejects(generatePoster(event, { apiKey: "test", downloadTimeoutMs: 5, fetchImpl: async () =>
      ++calls === 1 ? providerResult() : new Response(new ReadableStream({ cancel() { canceled = true; } })),
    }), errorCode("GENERATION_TIMEOUT"));
  } finally { clearInterval(keepAlive); }
  assert.equal(canceled, true);
  await assert.rejects(generatePoster(event, { apiKey: "test", signal: AbortSignal.abort(), fetchImpl: async () => { assert.fail("must not call provider"); } }), errorCode("GENERATION_TIMEOUT"));
});

test("missing keys fail before network access; canonical key takes precedence over alias", () => {
  const previous = [process.env.IDEOGRAM_API_KEY, process.env.IDEOGRAM_KEY];
  try {
    delete process.env.IDEOGRAM_API_KEY; delete process.env.IDEOGRAM_KEY;
    assert.throws(getIdeogramKey, errorCode("NOT_CONFIGURED"));
    process.env.IDEOGRAM_KEY = " alias "; assert.equal(getIdeogramKey(), "alias");
    process.env.IDEOGRAM_API_KEY = " canonical "; assert.equal(getIdeogramKey(), "canonical");
  } finally {
    for (const [index, key] of ["IDEOGRAM_API_KEY", "IDEOGRAM_KEY"].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

test("handler rejects invalid requests before key access or paid generation", async () => {
  const handler = createPosterHandler({ getKey: () => assert.fail("must not access key"), generate: async () => assert.fail("must not generate") });
  const requests = [request({}), request(event, { "Content-Type": "text/plain" }), request(event, { "Content-Length": "9000" }),
    new Request("http://localhost/api/posters", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }),
    request({ ...event, extra: "x".repeat(9000) }),
  ];
  for (const req of requests) {
    const result = await handler(req);
    assert.equal(result.status, 400); assert.equal((await result.json()).error.code, "INVALID_INPUT");
  }
});

test("handler preserves success contract and releases limiter after errors", async () => {
  let releases = 0;
  const handler = createPosterHandler({ getKey: () => "test", generate: async () => sampleResult, acquire: () => () => { releases++; } });
  const result = await handler(request());
  assert.equal(result.status, 200); assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await result.json(), sampleResult); assert.equal(releases, 1);
  for (const [code, status] of [["NOT_CONFIGURED", 503], ["RATE_LIMITED", 429], ["GENERATION_TIMEOUT", 504], ["GENERATION_FAILED", 502]]) {
    const response = await createPosterHandler({ getKey: () => "test", generate: async () => { throw new PosterError(code, "Safe message"); }, acquire: () => () => { releases++; } })(request());
    assert.equal(response.status, status); assert.equal((await response.json()).error.code, code);
    if (status === 429) assert.equal(response.headers.get("Retry-After"), "60");
  }
  assert.equal(releases, 5);
  const unexpected = await createPosterHandler({ getKey: () => "test", generate: async () => { throw new Error("SECRET"); } })(request());
  assert.equal(unexpected.status, 502); assert.ok(!(await unexpected.text()).includes("SECRET"));
});

test("demo limiter bounds concurrency and starts per minute, then recovers", () => {
  let now = 0;
  const acquire = createDemoLimiter(() => now);
  const first = acquire(); const second = acquire();
  assert.throws(acquire, errorCode("RATE_LIMITED"));
  first(); first(); second();
  for (let index = 0; index < 4; index++) acquire()();
  assert.throws(acquire, errorCode("RATE_LIMITED"));
  now = 60_000; acquire()();
});

test("Next.js route exports a callable handler and Node runtime settings", () => {
  assert.equal(typeof POST, "function"); assert.equal(runtime, "nodejs"); assert.equal(maxDuration, 120);
});
