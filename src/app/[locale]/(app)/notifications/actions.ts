"use server";

import { revalidatePath } from "next/cache";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

export async function markAllNotificationsReadAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getAuthContext();
  if (!ctx.user) return { ok: false, error: "UNAUTHENTICATED" };

  const db = getDB();
  await db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0").bind(ctx.user.id).run();

  revalidatePath("/", "layout");
  return { ok: true };
}
