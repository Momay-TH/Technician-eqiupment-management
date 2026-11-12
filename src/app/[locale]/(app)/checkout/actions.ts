/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

type Result<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

function genId(): string {
  return crypto.randomUUID();
}

async function nextCheckoutCode(): Promise<string> {
  const db = getDB();
  const year = new Date().getFullYear();
  const prefix = `CO-${year}-`;
  const row = await db
    .prepare("SELECT code FROM checkout_requests WHERE code LIKE ? ORDER BY code DESC LIMIT 1")
    .bind(`${prefix}%`)
    .first();
  const last = row?.code ? parseInt(row.code.slice(prefix.length), 10) : 0;
  return `${prefix}${String((isNaN(last) ? 0 : last) + 1).padStart(4, "0")}`;
}

async function notifyUsers(userIds: string[], title: string, body: string, entityId: string, type: string) {
  const db = getDB();
  for (const uid of userIds) {
    await db
      .prepare("INSERT INTO notifications (id, user_id, title, body, type, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(genId(), uid, title, body, type, "checkout_request", entityId)
      .run();
  }
}

export async function createCheckoutAction(input: { equipmentIds: string[]; purpose?: string; expectedReturnDate?: string | null }): Promise<Result<{ id: string; code: string }>> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("checkout:create")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const ids = Array.from(new Set(input.equipmentIds.filter(Boolean)));
  if (ids.length === 0) return { ok: false, error: "NO_ITEMS" };

  const db = getDB();

  // validate availability
  for (const id of ids) {
    const eq = await db.prepare("SELECT id, status, is_archived FROM equipment WHERE id = ?").bind(id).first();
    if (!eq || eq.is_archived || !["in_stock", "in_vehicle", "at_site"].includes(eq.status)) {
      return { ok: false, error: "ITEM_NOT_AVAILABLE" };
    }
    const active = await db.prepare("SELECT id FROM checkout_request_items WHERE equipment_id = ? AND status = 'checked_out'").bind(id).first();
    if (active) return { ok: false, error: "ITEM_ALREADY_CHECKED_OUT" };
  }

  const code = await nextCheckoutCode();
  const reqId = genId();
  await db
    .prepare("INSERT INTO checkout_requests (id, code, requested_by, status, purpose, expected_return_date) VALUES (?, ?, ?, 'pending', ?, ?)")
    .bind(reqId, code, ctx.user.id, input.purpose?.trim() || null, input.expectedReturnDate || null)
    .run();

  for (const eid of ids) {
    await db
      .prepare("INSERT INTO checkout_request_items (id, request_id, equipment_id, status) VALUES (?, ?, ?, 'pending')")
      .bind(genId(), reqId, eid)
      .run();
  }

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "checkout.create", "checkout_request", reqId, JSON.stringify({ code, items: ids.length }))
    .run();

  // notify approvers
  const approvers = await db.prepare("SELECT id FROM users WHERE is_active = 1 AND role IN ('admin','manager')").all();
  await notifyUsers(
    (approvers.results ?? []).map((u: any) => u.id),
    "มีคำขอเบิกอุปกรณ์ใหม่",
    `ใบเบิก ${code} รอการอนุมัติ`,
    reqId,
    "checkout_pending",
  );

  revalidatePath("/", "layout");
  return { ok: true, id: reqId, code };
}

export async function approveCheckoutAction(requestId: string): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("checkout:approve")) return { ok: false, error: "FORBIDDEN" };

  const db = getDB();
  const req = await db.prepare("SELECT id, code, status, requested_by FROM checkout_requests WHERE id = ?").bind(requestId).first();
  if (!req) return { ok: false, error: "NOT_FOUND" };
  if (req.status !== "pending") return { ok: false, error: "INVALID_STATUS" };
  if (req.requested_by === ctx.user.id) return { ok: false, error: "CANNOT_APPROVE_OWN" };

  await db
    .prepare("UPDATE checkout_requests SET status = 'approved', approved_by = ?, approved_at = ?, rejection_reason = NULL WHERE id = ?")
    .bind(ctx.user.id, new Date().toISOString(), requestId)
    .run();

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "checkout.approve", "checkout_request", requestId, JSON.stringify({ status: req.status }), JSON.stringify({ status: "approved" }))
    .run();

  await notifyUsers([req.requested_by], "คำขอเบิกได้รับอนุมัติ", `ใบเบิก ${req.code} ได้รับอนุมัติแล้ว`, requestId, "checkout_approved");

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rejectCheckoutAction(requestId: string, reason: string): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("checkout:approve")) return { ok: false, error: "FORBIDDEN" };
  if (!reason.trim()) return { ok: false, error: "REASON_REQUIRED" };

  const db = getDB();
  const req = await db.prepare("SELECT id, code, status, requested_by FROM checkout_requests WHERE id = ?").bind(requestId).first();
  if (!req) return { ok: false, error: "NOT_FOUND" };
  if (req.status !== "pending") return { ok: false, error: "INVALID_STATUS" };
  if (req.requested_by === ctx.user.id) return { ok: false, error: "CANNOT_APPROVE_OWN" };

  await db
    .prepare("UPDATE checkout_requests SET status = 'rejected', rejection_reason = ?, approved_by = ?, approved_at = ? WHERE id = ?")
    .bind(reason.trim(), ctx.user.id, new Date().toISOString(), requestId)
    .run();

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "checkout.reject", "checkout_request", requestId, JSON.stringify({ status: req.status }), JSON.stringify({ status: "rejected", reason: reason.trim() }))
    .run();

  await notifyUsers([req.requested_by], "คำขอเบิกถูกปฏิเสธ", `ใบเบิก ${req.code}: ${reason.trim()}`, requestId, "checkout_rejected");

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelCheckoutAction(requestId: string): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user) return { ok: false, error: "UNAUTHENTICATED" };

  const db = getDB();
  const req = await db.prepare("SELECT id, status, requested_by FROM checkout_requests WHERE id = ?").bind(requestId).first();
  if (!req) return { ok: false, error: "NOT_FOUND" };
  if (req.requested_by !== ctx.user.id) return { ok: false, error: "FORBIDDEN" };
  if (req.status !== "pending") return { ok: false, error: "INVALID_STATUS" };

  await db.prepare("UPDATE checkout_requests SET status = 'cancelled' WHERE id = ?").bind(requestId).run();
  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "checkout.cancel", "checkout_request", requestId, JSON.stringify({ status: "pending" }), JSON.stringify({ status: "cancelled" }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function handoverItemAction(requestId: string, assetCode: string): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user) return { ok: false, error: "UNAUTHENTICATED" };

  const db = getDB();
  const req = await db.prepare("SELECT id, status, requested_by FROM checkout_requests WHERE id = ?").bind(requestId).first();
  if (!req) return { ok: false, error: "NOT_FOUND" };
  if (req.status !== "approved") return { ok: false, error: "INVALID_STATUS" };

  const isApprover = ctx.permissions.includes("checkout:approve");
  const isRequester = req.requested_by === ctx.user.id;
  if (!isApprover && !isRequester) return { ok: false, error: "FORBIDDEN" };

  const { results: items } = await db
    .prepare("SELECT cri.id, cri.status, e.id AS eq_id, e.asset_code, e.name, e.status AS eq_status FROM checkout_request_items cri JOIN equipment e ON e.id = cri.equipment_id WHERE cri.request_id = ? AND cri.status = 'pending'")
    .bind(requestId)
    .all();

  const match = (items ?? []).find((row: any) => row.asset_code.toLowerCase() === assetCode.trim().toLowerCase());
  if (!match) return { ok: false, error: "ITEM_NOT_FOUND" };

  await db.prepare("UPDATE checkout_request_items SET status = 'checked_out', checked_out_at = ? WHERE id = ?").bind(new Date().toISOString(), match.id).run();
  await db
    .prepare("UPDATE equipment SET status = 'in_vehicle', assigned_to = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(req.requested_by, match.eq_id)
    .run();
  await db
    .prepare("INSERT INTO equipment_history (id, equipment_id, action, from_status, to_status, to_user, performed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), match.eq_id, "checkout", match.eq_status, "in_vehicle", req.requested_by, ctx.user.id, `Checkout ${requestId}`)
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function returnItemAction(requestId: string, assetCode: string, condition: "good" | "damaged", notes?: string): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("checkout:return")) return { ok: false, error: "FORBIDDEN" };

  const db = getDB();
  const req = await db.prepare("SELECT id, status FROM checkout_requests WHERE id = ?").bind(requestId).first();
  if (!req) return { ok: false, error: "NOT_FOUND" };
  if (req.status !== "approved") return { ok: false, error: "INVALID_STATUS" };

  const { results: itemRows } = await db
    .prepare("SELECT cri.id, cri.status, e.id AS eq_id, e.asset_code, e.status AS eq_status FROM checkout_request_items cri JOIN equipment e ON e.id = cri.equipment_id WHERE cri.request_id = ? AND cri.status = 'checked_out'")
    .bind(requestId)
    .all();

  const match = (itemRows ?? []).find((row: any) => row.asset_code.toLowerCase() === assetCode.trim().toLowerCase());
  if (!match) return { ok: false, error: "ITEM_NOT_FOUND" };

  const nextStatus = condition === "good" ? "in_stock" : "under_repair";
  const nextItemStatus = condition === "good" ? "returned" : "damaged";

  await db
    .prepare("UPDATE checkout_request_items SET status = ?, returned_at = ?, condition_on_return = ?, return_notes = ? WHERE id = ?")
    .bind(nextItemStatus, new Date().toISOString(), condition, notes?.trim() || null, match.id)
    .run();
  await db
    .prepare("UPDATE equipment SET status = ?, assigned_to = NULL, updated_at = datetime('now') WHERE id = ?")
    .bind(nextStatus, match.eq_id)
    .run();
  await db
    .prepare("INSERT INTO equipment_history (id, equipment_id, action, from_status, to_status, performed_by, notes, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), match.eq_id, "return", match.eq_status, nextStatus, ctx.user.id, notes?.trim() || null, condition === "damaged" ? "returned_damaged" : null)
    .run();

  const remaining = await db
    .prepare("SELECT COUNT(*) AS c FROM checkout_request_items WHERE request_id = ? AND status IN ('pending','checked_out')")
    .bind(requestId)
    .first();

  if ((remaining?.c ?? 0) === 0) {
    await db.prepare("UPDATE checkout_requests SET status = 'completed' WHERE id = ?").bind(requestId).run();
  }

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "checkout.return", "checkout_request", requestId, JSON.stringify({ asset_code: match.asset_code, condition }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}
