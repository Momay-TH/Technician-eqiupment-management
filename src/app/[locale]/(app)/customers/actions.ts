"use server";

import { revalidatePath } from "next/cache";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

function genId(): string {
  return crypto.randomUUID();
}

function canManage(permissions: string[]) {
  return permissions.includes("settings:manage") || permissions.includes("equipment:update");
}

export async function createCustomerSiteAction(input: { name: string; address?: string; contactName?: string; contactPhone?: string }): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !canManage(ctx.permissions)) return { ok: false, error: "FORBIDDEN" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "INVALID" };

  const db = getDB();
  const id = genId();
  await db
    .prepare("INSERT INTO customer_sites (id, name, address, contact_name, contact_phone) VALUES (?, ?, ?, ?, ?)")
    .bind(id, name, input.address?.trim() || null, input.contactName?.trim() || null, input.contactPhone?.trim() || null)
    .run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "customer_site.create", "customer_site", id, JSON.stringify({ name }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setCustomerSiteActiveAction(id: string, isActive: boolean): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !canManage(ctx.permissions)) return { ok: false, error: "FORBIDDEN" };

  const db = getDB();
  await db.prepare("UPDATE customer_sites SET is_active = ? WHERE id = ?").bind(isActive ? 1 : 0, id).run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, isActive ? "customer_site.activate" : "customer_site.deactivate", "customer_site", id, JSON.stringify({ is_active: isActive ? 0 : 1 }), JSON.stringify({ is_active: isActive ? 1 : 0 }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}
