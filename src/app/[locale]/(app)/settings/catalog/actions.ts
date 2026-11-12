/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

function genId(): string {
  return crypto.randomUUID();
}

async function guard() {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("settings:manage")) {
    return { actorId: null };
  }
  return { actorId: ctx.user.id };
}

export async function createCategoryAction(input: { code: string; name: string; description?: string }): Promise<Result> {
  const { actorId } = await guard();
  if (!actorId) return { ok: false, error: "FORBIDDEN" };

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) return { ok: false, error: "INVALID" };

  const db = getDB();
  try {
    const id = genId();
    await db
      .prepare("INSERT INTO categories (id, code, name, description) VALUES (?, ?, ?, ?)")
      .bind(id, code, name, input.description?.trim() || null)
      .run();
    await db
      .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(genId(), actorId, "catalog.category_create", "category", id, JSON.stringify({ code, name }))
      .run();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "FAILED" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setCategoryArchivedAction(id: string, isArchived: boolean): Promise<Result> {
  const { actorId } = await guard();
  if (!actorId) return { ok: false, error: "FORBIDDEN" };

  const db = getDB();
  await db.prepare("UPDATE categories SET is_archived = ? WHERE id = ?").bind(isArchived ? 1 : 0, id).run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), actorId, isArchived ? "catalog.category_archive" : "catalog.category_restore", "category", id, JSON.stringify({ is_archived: isArchived ? 0 : 1 }), JSON.stringify({ is_archived: isArchived ? 1 : 0 }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createDeviceTypeAction(input: { categoryId: string; code: string; name: string }): Promise<Result> {
  const { actorId } = await guard();
  if (!actorId) return { ok: false, error: "FORBIDDEN" };

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!input.categoryId || !code || !name) return { ok: false, error: "INVALID" };

  const db = getDB();
  try {
    const id = genId();
    await db
      .prepare("INSERT INTO device_types (id, category_id, code, name) VALUES (?, ?, ?, ?)")
      .bind(id, input.categoryId, code, name)
      .run();
    await db
      .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(genId(), actorId, "catalog.device_type_create", "device_type", id, JSON.stringify({ code, name, category_id: input.categoryId }))
      .run();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "FAILED" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setDeviceTypeArchivedAction(id: string, isArchived: boolean): Promise<Result> {
  const { actorId } = await guard();
  if (!actorId) return { ok: false, error: "FORBIDDEN" };

  const db = getDB();
  await db.prepare("UPDATE device_types SET is_archived = ? WHERE id = ?").bind(isArchived ? 1 : 0, id).run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), actorId, isArchived ? "catalog.device_type_archive" : "catalog.device_type_restore", "device_type", id, JSON.stringify({ is_archived: isArchived ? 0 : 1 }), JSON.stringify({ is_archived: isArchived ? 1 : 0 }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createBrandAction(input: { name: string }): Promise<Result> {
  const { actorId } = await guard();
  if (!actorId) return { ok: false, error: "FORBIDDEN" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "INVALID" };

  const db = getDB();
  try {
    const id = genId();
    await db.prepare("INSERT INTO brands (id, name) VALUES (?, ?)").bind(id, name).run();
    await db
      .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(genId(), actorId, "catalog.brand_create", "brand", id, JSON.stringify({ name }))
      .run();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "FAILED" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setBrandArchivedAction(id: string, isArchived: boolean): Promise<Result> {
  const { actorId } = await guard();
  if (!actorId) return { ok: false, error: "FORBIDDEN" };

  const db = getDB();
  await db.prepare("UPDATE brands SET is_archived = ? WHERE id = ?").bind(isArchived ? 1 : 0, id).run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), actorId, isArchived ? "catalog.brand_archive" : "catalog.brand_restore", "brand", id, JSON.stringify({ is_archived: isArchived ? 0 : 1 }), JSON.stringify({ is_archived: isArchived ? 1 : 0 }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createModelAction(input: { brandId: string; deviceTypeId: string; name: string; referencePrice?: number | null }): Promise<Result> {
  const { actorId } = await guard();
  if (!actorId) return { ok: false, error: "FORBIDDEN" };

  const name = input.name.trim();
  if (!input.brandId || !input.deviceTypeId || !name) return { ok: false, error: "INVALID" };

  const db = getDB();
  try {
    const id = genId();
    await db
      .prepare("INSERT INTO models (id, brand_id, device_type_id, name, reference_price) VALUES (?, ?, ?, ?, ?)")
      .bind(id, input.brandId, input.deviceTypeId, name, input.referencePrice ?? null)
      .run();
    await db
      .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(genId(), actorId, "catalog.model_create", "model", id, JSON.stringify({ name, brand_id: input.brandId, device_type_id: input.deviceTypeId }))
      .run();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "FAILED" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setModelArchivedAction(id: string, isArchived: boolean): Promise<Result> {
  const { actorId } = await guard();
  if (!actorId) return { ok: false, error: "FORBIDDEN" };

  const db = getDB();
  await db.prepare("UPDATE models SET is_archived = ? WHERE id = ?").bind(isArchived ? 1 : 0, id).run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), actorId, isArchived ? "catalog.model_archive" : "catalog.model_restore", "model", id, JSON.stringify({ is_archived: isArchived ? 0 : 1 }), JSON.stringify({ is_archived: isArchived ? 1 : 0 }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}
