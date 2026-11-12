/* eslint-disable @typescript-eslint/no-explicit-any */
// Cloudflare D1 access helper.
// Only available in the Cloudflare runtime (wrangler dev / Pages).
// Use `wrangler dev` for local development instead of `npm run dev`.
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getDB(): any {
  const ctx = getCloudflareContext();
  return (ctx.env as any).DB;
}

export function getStorage(): any {
  try {
    const ctx = getCloudflareContext();
    return (ctx.env as any).STORAGE;
  } catch {
    return undefined;
  }
}
