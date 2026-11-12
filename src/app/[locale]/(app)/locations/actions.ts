"use server";

import { revalidatePath } from "next/cache";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import type { LocationType } from "@/lib/constants";

type Result = { ok: true } | { ok: false; error: string };

function genId(): string {
  return crypto.randomUUID();
}

function canManage(permissions: string[]) {
  return permissions.includes("settings:manage") || permissions.includes("equipment:update");
}

export async function createLocationAction(input: { name: string; type: LocationType; code?: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !canManage(ctx.permissions)) return { ok: false, error: "FORBIDDEN" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "INVALID" };

  const db = getDB();
  const id = genId();
  await db
    .prepare("INSERT INTO locations (id, name, type, code) VALUES (?, ?, ?, ?)")
    .bind(id, name, input.type, input.code?.trim() || null)
    .run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "location.create", "location", id, JSON.stringify({ name, type: input.type, code: input.code ?? null }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setLocationActiveAction(id: string, isActive: boolean): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !canManage(ctx.permissions)) return { ok: false, error: "FORBIDDEN" };

  const db = getDB();
  await db.prepare("UPDATE locations SET is_active = ? WHERE id = ?").bind(isActive ? 1 : 0, id).run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, isActive ? "location.activate" : "location.deactivate", "location", id, JSON.stringify({ is_active: isActive ? 0 : 1 }), JSON.stringify({ is_active: isActive ? 1 : 0 }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}
