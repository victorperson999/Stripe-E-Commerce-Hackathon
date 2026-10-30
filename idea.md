# Tonight — AI Event Poster Studio

Turn an event idea into a promotional poster with Ideogram. Enter the event details, choose a visual style, generate one portrait poster, and download it.

**Hackathon target:** a working, deployed demo in roughly 30 minutes after credentials and hosting access are ready.

This README is the implementation plan. Application code and deployment have not been created yet. The proposed repository is [Stripe-E-Commerce-Hackathon](https://github.com/victorperson999/Stripe-E-Commerce-Hackathon). Repository access must be confirmed before adopting this structure; retain any existing framework if the repository already has one.

## Product idea

Tonight helps meetup hosts, student clubs, and small businesses create an event poster without design software.

Example demo: **Builders After Dark**, Friday at 7 PM, Toronto — an evening for indie hackers. Generate it in Neon Nightlife, then try Retro Print.

### MVP

1. Enter event name, date/time display text, venue, and a short description.
2. Choose Neon Nightlife, Retro Print, or Minimal Editorial.
3. Generate one portrait poster through the Ideogram API.
4. See a loading state, then a large poster preview.
5. Download the generated image or regenerate with changed inputs.

Use a single responsive page. Keep the latest result in browser memory; refreshing may clear it. Generated lettering should be reviewed before sharing.

### Out of scope for the first demo

Accounts, payment checkout, subscriptions, saved galleries, databases, image editing, batch generation, and email delivery. Stripe Projects provides the infrastructure workflow; payment processing is not part of this MVP.

## Two-person ownership

| Owner | Responsibility | Deliverables |
| --- | --- | --- |
| **You + your coding assistant** | Frontend, initial scaffold, integration, deployment | Event form, style cards, loading/error/result states, image download, responsive polish, Stripe Projects hosting setup, final deployment and submission links |
| **Teammate + their coding assistant** | Backend and Ideogram integration | Validated generation endpoint, style-specific prompt construction, server-side Ideogram call, image retrieval, stable API response, useful failures |

Both people use the same repository and API contract. Build each half independently; combine through one HTTP endpoint. Avoid building two separate application frameworks that must be reconciled at the end.

### Proposed stack and file ownership

Use Next.js App Router with TypeScript and npm for a new repository. Use plain CSS or the styling system already installed. Target Vercel hosting through Stripe Projects, subject to successful provider setup.

```text
src/
  app/
    page.tsx                       # YOU: poster studio
    layout.tsx                     # YOU: app shell
    globals.css                    # YOU: styles
    api/posters/route.ts            # TEAMMATE: POST endpoint
  components/poster-studio/         # YOU: form, style picker, preview
  lib/server/ideogram.ts            # TEAMMATE: provider calls and image retrieval
  lib/server/poster-prompts.ts      # TEAMMATE: prompt templates and validation
  types/poster.ts                   # YOU: shared contract, agreed before branching
.env.example                       # YOU: variable names only
README.md                          # YOU: plan and final setup instructions
```

You own package.json, the lockfile, framework configuration, and deployment configuration. The teammate should use native fetch and avoid adding dependencies without coordinating first. Never commit actual API keys or generated credential files.

## Shared API contract — agree before coding

### Request

`POST /api/posters` with `Content-Type: application/json`:

```json
{
  "title": "Builders After Dark",
  "dateTimeText": "Friday, 7 PM",
  "venue": "Toronto",
  "description": "An evening for indie hackers to meet and share ideas.",
  "style": "neon"
}
```

| Field | Rules |
| --- | --- |
| title | Required; trimmed; 1–80 characters |
| dateTimeText | Required; trimmed; 1–80 characters; display as supplied |
| venue | Required; trimmed; 1–120 characters |
| description | Optional; at most 400 characters |
| style | Exactly `neon`, `retro`, or `minimal` |

One image per request. The server controls the model, portrait aspect ratio, and generation settings. Verify the current Ideogram documentation and which model the supplied key can use before choosing the endpoint.

### Success — HTTP 200

```json
{
  "imageDataUrl": "data:image/png;base64,<encoded-image-bytes>",
  "mimeType": "image/png",
  "filename": "builders-after-dark.png"
}
```

The example is illustrative, not a usable image. Support PNG, JPEG, or WebP and use the matching MIME type and file extension. The backend retrieves the generated image and returns its bytes as a data URL. The frontend uses that value for the preview and converts it to a Blob for download. This avoids relying on cross-origin downloads or permanent provider image URLs; persistent storage is not needed for the MVP.

Keep image size within hosting response limits. Check provider latency against the host's function timeout early. If synchronous generation does not fit, agree on a job/polling contract before changing either side.

### Failure

```json
{
  "error": {
    "code": "GENERATION_FAILED",
    "message": "We could not generate your poster. Please try again."
  }
}
```

Use `400 / INVALID_INPUT`, `429 / RATE_LIMITED`, `503 / NOT_CONFIGURED`, `504 / GENERATION_TIMEOUT`, or `502 / GENERATION_FAILED` as appropriate. Never return credentials or raw provider diagnostics to the browser. Avoid automatic retries that could create extra billable generations.

### Working independently

- **Frontend:** use a local sample poster and a temporary mock function that returns the agreed success shape. Also mock loading and error states. Remove the mock before deployment.
- **Backend:** test the endpoint with the request above before the frontend is connected. Validate input on the server, map provider failures, and bound image download size and time. Fetch image URLs from the trusted provider response only; do not accept arbitrary download URLs from the browser.
- **Integration:** connect the form to `fetch('/api/posters', ...)`; preserve inputs after errors and disable duplicate submission while a request is pending.

## Credentials and Stripe Projects

- hKomi has passed Stripe Projects authentication and eligibility checks in the current workspace.
- A project for this application and its hosting resource still need to be created.
- Use a dedicated project and new hosting resource for Tonight. Keep this work separate from hKomi's existing application resources.
- Use the existing Ideogram API key directly. Store it as server-only `IDEOGRAM_API_KEY` locally and in the host's secret/environment settings. Never prefix it with `NEXT_PUBLIC_`.
- Ideogram API usage may consume paid credits. Confirm the available generation budget and add basic request throttling before sharing the demo broadly.
- Select a free hosting tier. Any paid upgrade needs an explicit team decision.
- Stripe sandbox authorization is unnecessary for this MVP because it contains no payment calls.

Run Projects commands from the repository root, after cloning and checking its instructions:

```bash
stripe projects init tonight --mode manual
stripe projects catalog vercel
# Confirm the current service slug and tier in the catalog before provisioning.
stripe projects add vercel/project
stripe projects env --pull
stripe projects status
```

Provider account linking may require a browser approval. Projects provisions the hosting resource; the integration owner must still deploy the code and configure the server-side Ideogram secret on the host. Avoid hand-editing CLI-managed project state. Review generated .gitignore entries before committing.

## Branch and merge workflow

1. **You:** inspect existing code, create or confirm the starter app, commit the shared types and .env.example, and share the base commit with the teammate.
2. Both branch from that same commit: `feat/poster-ui` and `feat/ideogram-api`.
3. Work only in the assigned paths. Coordinate any shared configuration change.
4. Around minute 20, merge the backend and frontend branches into the integration branch and resolve differences together.
5. Run the build and one real end-to-end generation before deploying the final version.

Use pull requests if practical. Avoid force-pushing or replacing a teammate's changes. The final deployment owner is **you**.

## 30-minute schedule

| Time | You | Teammate |
| --- | --- | --- |
| 0–5 min | Shared scaffold/types; start Projects and hosting setup | Confirm API key access; verify model endpoint and response |
| 5–15 min | Build form, style picker, preview and download using mock data | Implement validation, prompts, generation and image response |
| 15–20 min | Mobile layout, loading and failure states | Smoke-test a real generation and failure handling |
| 20–25 min | Merge, wire the endpoint, build | Help verify the agreed contract and fix integration issues |
| 25–30 min | Deploy and prepare submission | Test the deployed app on another device and prepare demo text |

This is a timebox, not a guarantee: provider onboarding, credits, generation latency, and deployment access can take longer. If behind, ship one style first and preserve generation, preview, download, and deployment.

## Definition of done

- [ ] The deployed page accepts event details and generates a real Ideogram poster.
- [ ] The preview and downloaded file show the same image.
- [ ] Invalid inputs and provider failures display understandable messages.
- [ ] No secrets appear in client code, network responses, or source control.
- [ ] The form and preview work on a phone.
- [ ] Production build passes after integration.
- [ ] A public repository URL, deployed app URL, Stripe account ID, and Projects share link are ready.

After the starter app is committed, document its actual install/dev/build commands here. The intended npm scripts are `npm run dev` and `npm run build`; they do not exist yet in this planning-only artifact.

## Hackathon submission

From the initialized project directory with at least one provisioned service:

```bash
stripe whoami
stripe projects share
```

Go to [the leaderboard](https://projects.dev/leaderboard), choose **Submit Your Project**, and supply the account ID, stack share link, public repository URL, deployed URL, and organizer's case-sensitive hackathon code if provided. The stack share link and deployed app URL are different artifacts. Confirm the account ID matches the account that owns this project.

Useful references: [participant guide](https://projects.dev/community-participants), [Stripe Projects](https://docs.stripe.com/projects), [Ideogram API documentation](https://developer.ideogram.ai/).
