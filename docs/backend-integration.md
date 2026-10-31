# Tonight backend integration

The backend originated on `feat/ideogram-api` and is merged with the frontend on
`victorbranch`. This implements the backend role from `idea.md`; the other teammate
owns the Next.js scaffold, UI, shared frontend types and deployment.

## Files and integration

- `src/app/api/posters/route.ts`: App Router `POST /api/posters`, default Node runtime, 120-second function duration. Cache Components disallows an explicit `runtime` export.
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
- The merged `victorbranch` app passes `npm run build`, including TypeScript.
  The redundant route `runtime` export was removed because Next.js 16.4.3 Cache
  Components requires the default Node runtime and rejects that export. The
  120-second duration remains configured. Dependency installation generated
  `package-lock.json` for reproducible installs with `npm ci`.
- A production server started with `npm run start -- --hostname 127.0.0.1` served
  the form at HTTP 200. The real `/api/posters` endpoint returned 405 for GET and
  400/INVALID_INPUT for an unsupported style.
- One additional authorized Retro generation through the frontend API client and
  the running HTTP endpoint completed in 10.0 seconds (1,225,651-byte PNG, quoted
  US$0.06). The frontend download function produced a Blob byte-for-byte identical
  to the preview data URL. The download test used a DOM stand-in, not a browser.
  Visual inspection of `.backend-artifacts/integrated-retro-poster.png` confirmed
  readable title, date/time and venue. Minimal has automated coverage only.
- Browser control was unavailable during this review. Actual button interactions,
  browser file saving, responsive layout and phone testing remain unverified.

## Deployment handoff

The Stripe Project `tonight` has a Vercel Hobby plan and the `tonight` hosting
project provisioned through Stripe Projects. Do not create duplicate resources.

Production URL: https://tonight-cyan.vercel.app

Vercel reports the deployment Ready after a successful production build.
`IDEOGRAM_API_KEY` is configured directly in Vercel as a Secret for Production
and Preview. `NEXT_PUBLIC_POSTER_MOCK` is unset. Vercel authentication protection
is disabled so visitors can open the app. Fluid Compute is enabled, and its
documented Hobby duration limit covers the route's 120-second setting.

The deployment was uploaded from this local workspace using the Vercel CLI.
Git integration is not connected; pushing to GitHub does not automatically
redeploy this project yet. `.vercelignore` excludes local credentials, Stripe
state, agent configuration and test artifacts from deployment uploads.

Later environment variable changes require a new deployment.

### Live deployment verification

- The public homepage returned HTTP 200 and contained the expected form labels.
- The hosted API returned HTTP 405 for GET and HTTP 400/INVALID_INPUT for an
  unsupported style.
- One authorized Minimal generation through the frontend API client against the
  public URL succeeded in 8.5 seconds. The quote was US$0.06; the returned PNG
  was 500,890 bytes. This also verifies the deployed server can use its Ideogram
  credential.
- The frontend download function produced bytes identical to the preview image
  (SHA-256 `74f6d4c4c2fa734e48f89a951107d652c68efcc0522205230a61470bc5afc09b`).
  This check used a DOM stand-in, not a browser download.
- Visual review of `.backend-artifacts/live-minimal-poster.png` found a readable
  title, date/time and venue, but also unwanted garbled small labels and extra
  description text. Generated typography remains a quality limitation.
- Browser control was unavailable. Actual browser clicks, file saving and phone
  layout still need verification. Results are saved locally in the ignored
  `.backend-artifacts/live-check.json` file.

References: [Ideogram 3.0 API](https://developer.ideogram.ai/v2/api-reference/images/generate/ideogram-3),
[Vercel function limits](https://vercel.com/docs/functions/limitations),
[Vercel environment variables](https://vercel.com/docs/environment-variables).
