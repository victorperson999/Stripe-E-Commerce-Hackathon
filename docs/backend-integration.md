# Tonight backend integration

Backend branch: `feat/ideogram-api`. This implements the backend role from `idea.md`;
the other teammate owns the Next.js scaffold, UI, shared frontend types and deployment.

## Files and integration

- `src/app/api/posters/route.ts`: App Router `POST /api/posters`, Node runtime, 120-second function duration.
- `src/lib/server/poster-prompts.ts`: validated event input and three style prompts.
- `src/lib/server/ideogram.ts`: server-only credential access, provider request and image retrieval.
- Other `src/lib/server/poster-*` modules: bounded reads, safe errors and request handling.

No runtime dependencies were added. Merge these paths into the Next.js/TypeScript
scaffold. Keep all `lib/server` modules out of client components. They use Node APIs.
The backend exports structural `PosterInput` and `PosterResult` types; frontend
types should match the wire contract below. No frontend-owned `src/types/poster.ts`
or package/lock/config files are created by this branch.

Use Node 24 for the standalone test commands below. The app requires Node 22+
(or the version required by the teammate's Next.js release). Check the configured
hosting runtime and function duration during deployment.

## Environment

Set `IDEOGRAM_API_KEY` in the server environment. `IDEOGRAM_KEY` is also supported
for the supplied hackathon `.env`; the canonical variable takes precedence.
Next.js loads `.env` automatically. Never use a `NEXT_PUBLIC_` prefix. The deployment
owner must configure the same server-only key on the host, including preview
deployments if needed. No Stripe credentials are required by this endpoint.

Local environment files and generated test posters are ignored by Git. Ignore rules
do not remove credentials from existing Git history.

## Wire contract

Send `Content-Type: application/json` with:

```json
{
  "title": "Builders After Dark",
  "dateTimeText": "Friday, 7 PM",
  "venue": "Toronto",
  "description": "An evening for indie hackers to meet and share ideas.",
  "style": "neon"
}
```

Required text is trimmed: title and date/time are 1–80 characters, venue 1–120.
Description is optional text up to 400 characters. Style is `neon`, `retro` or
`minimal`. Date/time is displayed literally. The description is visual context,
not poster lettering. Request bodies are limited to 8 KiB; unknown fields are
discarded and cannot override provider settings or supply download URLs.

Success (`200`): `{ imageDataUrl, mimeType, filename }`. MIME is PNG, JPEG or WebP
and the filename extension matches the detected bytes. Preview the data URL and
convert it to a Blob for download. No storage or persistent provider URL is needed.

Failure: `{ "error": { "code": "...", "message": "..." } }`.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | INVALID_INPUT | Invalid JSON, fields, content type, oversized or incomplete request |
| 429 | RATE_LIMITED | Local demo throttle or provider rate limit; `Retry-After: 60` |
| 503 | NOT_CONFIGURED | Missing key, rejected credentials, access or credit problem |
| 504 | GENERATION_TIMEOUT | Generation/download deadline or request cancellation |
| 502 | GENERATION_FAILED | Other provider failures, blocked content, invalid/oversized image |

Responses are `Cache-Control: no-store`. Render the safe `error.message`, preserve
the form, and require an explicit user action to retry. A timeout/disconnect does
not guarantee the upstream generation stopped or was not billed. There are no
automatic retries or alternate-model fallbacks.

## Provider settings and limits

Uses `POST https://api.ideogram.ai/v2/image/generate/ideogram-3` with one image,
`aspect_ratio: 2x3`, `rendering_speed: default`, `style_type: design`,
`magic_prompt: off`, and synchronous generation. All are server-controlled.

Provider metadata is capped at 64 KiB; generation has a 90-second deadline.
Downloads have a 15-second deadline and a 3,000,000-byte cap enforced while
streaming, even when Content-Length is missing or incorrect. Base64 plus JSON
stays under Vercel's documented 4.5 MB response limit. Oversized images fail
cleanly; they are not silently recompressed. Supported image signatures and
declared content types are checked, not fully decoded.

Only HTTPS URLs on `ideogram.ai` or its subdomains are downloaded. Redirects are
rejected and the API key is never forwarded to image downloads. If a future
provider response uses a different CDN, verify and explicitly allow that hostname.

The built-in limiter permits two active requests and six starts per minute **per
server process**, shared across visitors. It resets on process restart and does
not coordinate between server instances. It is basic demo throttling, not a
global budget limit. Before unrestricted public use, the deployment owner should
add shared rate limiting or host access controls and monitor provider spending.

## Verification

Run dependency-free automated tests (no network or paid calls):

```powershell
node --import ./tests/backend/register-typescript.mjs --test ./tests/backend/posters.test.mjs
```

Validate the actual request and get a non-billable quote using the local key:

```powershell
node --env-file=.env --import ./tests/backend/register-typescript.mjs ./scripts/check-ideogram.mjs
```

Explicitly generate ONE image after accepting the quoted cost:

```powershell
node --env-file=.env --import ./tests/backend/register-typescript.mjs ./scripts/check-ideogram.mjs --generate --max-cost-usd=0.08 --style=neon
```

The cost cap is per invocation, based on the provider's dry-run quote. Outputs
are in ignored `.backend-artifacts/`. Use `retro` or `minimal` to test another
style. Inspect lettering, image quality and the reported response size/latency.
The script invokes the exported POST handler with a standard Request and verifies
its Response. It does not start a Next.js server. It never prints the key or signed
image URLs.

### Verified in this workspace

- All 15 automated tests passed, including input rejection, provider failures,
  streamed size limits, stalled downloads, request cancellation and demo throttling.
- Strict TypeScript checking passed for the route and all its imports. The checker
  was installed separately in ignored `.backend-artifacts/typecheck`; no app
  package or lockfile was changed.
- Three billable neon generations completed. Their dry-run quotes totaled
  US$0.12 (two turbo samples at US$0.03 and the final standard-quality sample at
  US$0.06). This is the quoted total, not an account billing reconciliation.
- The final prompt returned HTTP 200 through the exported POST handler in 14.0
  seconds, with a 1,153,807-byte PNG. Visual review found the intended headline,
  date/time and venue, with no extra field labels or description text. The model
  styled the supplied text in uppercase. Exact casing/lettering is not guaranteed.
- Final sample: `.backend-artifacts/neon-builders-after-dark.png` (local, ignored).
- Retro and minimal prompts are covered by automated tests, but have not been
  checked with billable generations. The Next.js scaffold, application build and
  deployed HTTP endpoint remain to be verified by integration with the UI owner.

After the scaffold is merged, run its typecheck/build, then send the example
request to the actual local and deployed `/api/posters`. Verify that the displayed
and downloaded poster match, mobile errors remain readable, and the deployment
supports the configured function timeout. Generated lettering needs human review.

References: [Ideogram 3.0 API](https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-3),
[Vercel function limits](https://vercel.com/docs/functions/limitations).
