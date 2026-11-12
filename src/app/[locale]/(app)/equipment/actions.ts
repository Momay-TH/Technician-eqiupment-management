/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { getDB, getStorage } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import type { EquipmentStatus } from "@/lib/constants";

type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

export type EquipmentInput = {
  name: string;
  model_id: string;
  serial_number: string;
  status: EquipmentStatus;
  location_id: string | null;
  customer_site_id: string | null;
  assigned_to: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  vendor: string | null;
  warranty_months: number | null;
  installed_at: string | null;
  installed_by: string | null;
  notes: string | null;
  image_urls: string[];
};

function genId(): string {
  return crypto.randomUUID();
}

async function generateAssetCode(deviceTypeId: string): Promise<string> {
  const db = getDB();
  const row = await db
    .prepare("SELECT c.code AS cat_code, dt.code AS type_code FROM device_types dt JOIN categories c ON c.id = dt.category_id WHERE dt.id = ?")
    .bind(deviceTypeId)
    .first();
  if (!row) throw new Error("device type not found");

  const prefix = `${row.cat_code}-${row.type_code}-`;
  const maxRow = await db
    .prepare("SELECT MAX(asset_code) AS max_code FROM equipment WHERE asset_code LIKE ?")
    .bind(`${prefix}%`)
    .first();

  let next = 1;
  if (maxRow?.max_code) {
    const seq = parseInt(maxRow.max_code.split("-").pop() ?? "0", 10);
    if (!isNaN(seq)) next = seq + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function createEquipmentAction(input: EquipmentInput): Promise<ActionResult<{ id: string; assetCode: string }>> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("equipment:create")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const db = getDB();
  const model = await db.prepare("SELECT device_type_id FROM models WHERE id = ?").bind(input.model_id).first();
  if (!model) return { ok: false, error: "INVALID_MODEL" };

  const assetCode = await generateAssetCode(model.device_type_id);

  const id = genId();
  try {
    await db
      .prepare(
        `INSERT INTO equipment (id, asset_code, serial_number, name, model_id, status, location_id, customer_site_id, assigned_to, purchase_date, purchase_price, vendor, warranty_months, installed_at, installed_by, image_urls, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        assetCode,
        input.serial_number.trim(),
        input.name.trim(),
        input.model_id,
        input.status,
        input.location_id,
        input.customer_site_id,
        input.assigned_to,
        input.purchase_date,
        input.purchase_price,
        input.vendor,
        input.warranty_months,
        input.installed_at,
        input.installed_by,
        JSON.stringify(input.image_urls ?? []),
        input.notes,
      )
      .run();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "FAILED" };
  }

  await db
    .prepare("INSERT INTO equipment_history (id, equipment_id, action, to_status, to_location_id, to_site_id, to_user, notes, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), id, "created", input.status, input.location_id, input.customer_site_id, input.assigned_to, input.notes, ctx.user.id)
    .run();

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "equipment.create", "equipment", id, JSON.stringify({ asset_code: assetCode, name: input.name }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true, id, assetCode };
}

export async function updateEquipmentAction(id: string, input: EquipmentInput): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("equipment:update")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const db = getDB();
  const existing = await db
    .prepare("SELECT id, serial_number, status, location_id, customer_site_id FROM equipment WHERE id = ?")
    .bind(id)
    .first();

  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const serialChanged = input.serial_number.trim() !== existing.serial_number;
  if (serialChanged && !ctx.permissions.includes("equipment:serial_edit")) {
    return { ok: false, error: "SERIAL_LOCKED" };
  }

  try {
    await db
      .prepare(
        `UPDATE equipment SET serial_number = ?, name = ?, model_id = ?, status = ?, location_id = ?, customer_site_id = ?, assigned_to = ?, purchase_date = ?, purchase_price = ?, vendor = ?, warranty_months = ?, installed_at = ?, installed_by = ?, image_urls = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(
        serialChanged ? input.serial_number.trim() : existing.serial_number,
        input.name.trim(),
        input.model_id,
        input.status,
        input.location_id,
        input.customer_site_id,
        input.assigned_to,
        input.purchase_date,
        input.purchase_price,
        input.vendor,
        input.warranty_months,
        input.installed_at,
        input.installed_by,
        JSON.stringify(input.image_urls ?? []),
        input.notes,
        id,
      )
      .run();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "FAILED" };
  }

  if (serialChanged) {
    await db
      .prepare("INSERT INTO equipment_history (id, equipment_id, action, notes, performed_by) VALUES (?, ?, ?, ?, ?)")
      .bind(genId(), id, "serial_edit", `Serial: ${existing.serial_number} → ${input.serial_number.trim()}`, ctx.user.id)
      .run();
    await db
      .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(genId(), ctx.user.id, "equipment.serial_edit", "equipment", id, JSON.stringify({ serial_number: existing.serial_number }), JSON.stringify({ serial_number: input.serial_number.trim() }))
      .run();
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeStatusAction(id: string, input: { status: EquipmentStatus; reason?: string; notes?: string; location_id?: string | null; customer_site_id?: string | null }): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx.user) return { ok: false, error: "UNAUTHENTICATED" };

  const db = getDB();
  const eq = await db.prepare("SELECT * FROM equipment WHERE id = ?").bind(id).first();
  if (!eq) return { ok: false, error: "NOT_FOUND" };

  const canUpdate = ctx.permissions.includes("equipment:update");
  const isOwner = eq.assigned_to === ctx.user.id && ctx.permissions.includes("checkout:return");
  const allowedStatuses = ["in_stock", "under_repair"];
  if (!canUpdate && !(isOwner && allowedStatuses.includes(input.status))) {
    return { ok: false, error: "FORBIDDEN" };
  }

  // transition check
  const transition = await db
    .prepare("SELECT 1 FROM equipment_status_transitions WHERE from_status = ? AND to_status = ?")
    .bind(eq.status, input.status)
    .first();
  if (!transition) return { ok: false, error: `transition ${eq.status} -> ${input.status} not allowed` };

  if (input.status === "disposed" && !ctx.permissions.includes("equipment:archive")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  await db
    .prepare("UPDATE equipment SET status = ?, location_id = COALESCE(?, location_id), customer_site_id = COALESCE(?, customer_site_id), updated_at = datetime('now') WHERE id = ?")
    .bind(input.status, input.location_id ?? null, input.customer_site_id ?? null, id)
    .run();

  await db
    .prepare(
      "INSERT INTO equipment_history (id, equipment_id, action, from_status, to_status, from_location_id, to_location_id, from_site_id, to_site_id, notes, reason, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      genId(),
      id,
      "status_change",
      eq.status,
      input.status,
      eq.location_id,
      input.location_id ?? eq.location_id,
      eq.customer_site_id,
      input.customer_site_id ?? eq.customer_site_id,
      input.notes ?? null,
      input.reason ?? null,
      ctx.user.id,
    )
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function uploadEquipmentFileAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const ctx = await getAuthContext();
  if (!ctx.user || (!ctx.permissions.includes("equipment:update") && !ctx.permissions.includes("equipment:create"))) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "NO_FILE" };

  const storage = getStorage();
  if (!storage) return { ok: false, error: "STORAGE_NOT_CONFIGURED" };

  const key = `equipment/${Date.now()}-${crypto.randomUUID()}-${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  await storage.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  return { ok: true, url: `/api/files/${key}` };
}

export async function archiveEquipmentAction(id: string): Promise<ActionResult> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("equipment:archive")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const db = getDB();
  await db.prepare("UPDATE equipment SET is_archived = 1 WHERE id = ?").bind(id).run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "equipment.archive", "equipment", id, JSON.stringify({ is_archived: true }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}
