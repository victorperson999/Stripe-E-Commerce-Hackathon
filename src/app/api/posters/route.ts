import { createPosterHandler } from "../../../lib/server/poster-handler";

// Cache Components uses Node.js and disallows an explicit runtime export.
export const maxDuration = 120;
export const POST = createPosterHandler();
