/* eslint-disable @typescript-eslint/no-explicit-any */
// Cloudflare binding access.
//
// In production (wrangler / Workers) these come from the Cloudflare context.
// During plain `next dev` there is no workerd, so we fall back to a local SQLite
// database + filesystem storage (see `src/lib/dev-sqlite.ts`) under `.dev/`.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDevDB, getDevStorage } from "@/lib/dev-sqlite";

function cloudflareEnv(): any | null {
  try {
    return (getCloudflareContext().env as any) ?? null;
  } catch {
    return null;
  }
}

export function getDB(): any {
  const db = cloudflareEnv()?.DB;
  if (db) return db;
  return getDevDB();
}

export function getStorage(): any {
  const storage = cloudflareEnv()?.STORAGE;
  if (storage) return storage;
  try {
    return getDevStorage();
  } catch {
    return undefined;
  }
}
