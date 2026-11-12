"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import type { PermissionKey, UserRole } from "@/lib/constants";

type Result<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

function genId(): string {
  return crypto.randomUUID();
}

export async function createUserAction(input: {
  email: string;
  username: string;
  name: string;
  role: UserRole;
  password: string;
}): Promise<Result<{ id: string }>> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("users:manage")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const name = input.name.trim();

  if (!email.includes("@") || !name) return { ok: false, error: "INVALID" };
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return { ok: false, error: "INVALID_USERNAME" };
  }
  if (input.password.length < 8) return { ok: false, error: "WEAK_PASSWORD" };

  const db = getDB();

  const existingEmail = await db
    .prepare("SELECT id FROM users WHERE lower(email) = lower(?)")
    .bind(email)
    .first();
  if (existingEmail) return { ok: false, error: "EMAIL_TAKEN" };

  const existingUsername = await db
    .prepare("SELECT id FROM users WHERE lower(username) = lower(?)")
    .bind(username)
    .first();
  if (existingUsername) return { ok: false, error: "USERNAME_TAKEN" };

  const id = genId();
  const passwordHash = await hashPassword(input.password);

  await db
    .prepare(
      "INSERT INTO users (id, email, username, name, role, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
    )
    .bind(id, email, username, name, input.role, passwordHash)
    .run();

  await db
    .prepare(
      "INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, after) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(genId(), ctx.user.id, "user.create", "user", id, JSON.stringify({ email, username, role: input.role }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function updateUserRoleAction(userId: string, role: UserRole): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("users:manage")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const db = getDB();
  const target = await db
    .prepare("SELECT id, role, is_active FROM users WHERE id = ?")
    .bind(userId)
    .first();

  if (!target) return { ok: false, error: "NOT_FOUND" };

  // Guard: at least one permission manager must remain
  if (target.role !== role) {
    const actives = await db
      .prepare("SELECT id, role FROM users WHERE is_active = 1")
      .all();
    const overrides = await db
      .prepare("SELECT user_id, effect FROM user_permission_overrides WHERE permission = 'permissions:manage'")
      .all();
    const granted = new Set((overrides.results ?? []).filter((o: any) => o.effect === "grant").map((o: any) => o.user_id));
    const denied = new Set((overrides.results ?? []).filter((o: any) => o.effect === "deny").map((o: any) => o.user_id));
    const remaining = (actives.results ?? []).filter((u: any) => {
      if (u.id === userId) return false;
      if (denied.has(u.id)) return false;
      const r = u.id === userId ? role : u.role;
      return r === "admin" || granted.has(u.id);
    });
    // also account for target's new role if still a manager
    const targetStillManager = role === "admin" || granted.has(userId);
    if (remaining.length === 0 && !targetStillManager) {
      return { ok: false, error: "LAST_PERMISSION_MANAGER" };
    }
  }

  await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId).run();

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "user.role_change", "user", userId, JSON.stringify({ role: target.role }), JSON.stringify({ role }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("users:manage")) {
    return { ok: false, error: "FORBIDDEN" };
  }
  if (userId === ctx.user.id && !isActive) {
    return { ok: false, error: "SELF_DEACTIVATE" };
  }

  const db = getDB();
  const target = await db
    .prepare("SELECT id, role, is_active FROM users WHERE id = ?")
    .bind(userId)
    .first();

  if (!target) return { ok: false, error: "NOT_FOUND" };

  if (!isActive) {
    const actives = await db
      .prepare("SELECT id, role FROM users WHERE is_active = 1")
      .all();
    const overrides = await db
      .prepare("SELECT user_id, effect FROM user_permission_overrides WHERE permission = 'permissions:manage'")
      .all();
    const granted = new Set((overrides.results ?? []).filter((o: any) => o.effect === "grant").map((o: any) => o.user_id));
    const denied = new Set((overrides.results ?? []).filter((o: any) => o.effect === "deny").map((o: any) => o.user_id));
    const remaining = (actives.results ?? []).filter((u: any) => {
      if (u.id === userId) return false;
      if (denied.has(u.id)) return false;
      return u.role === "admin" || granted.has(u.id);
    });
    if (remaining.length === 0) {
      return { ok: false, error: "LAST_PERMISSION_MANAGER" };
    }
  }

  await db
    .prepare("UPDATE users SET is_active = ? WHERE id = ?")
    .bind(isActive ? 1 : 0, userId)
    .run();

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, isActive ? "user.activate" : "user.deactivate", "user", userId, JSON.stringify({ is_active: target.is_active }), JSON.stringify({ is_active: isActive ? 1 : 0 }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetPasswordAction(userId: string, password: string): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("users:manage")) {
    return { ok: false, error: "FORBIDDEN" };
  }
  if (password.length < 8) return { ok: false, error: "WEAK_PASSWORD" };

  const db = getDB();
  const hash = await hashPassword(password);
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, userId).run();

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "user.password_reset", "user", userId)
    .run();

  return { ok: true };
}

export async function setPermissionOverrideAction(input: {
  userId: string;
  permission: PermissionKey;
  effect: "inherit" | "grant" | "deny";
}): Promise<Result> {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("permissions:manage")) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const db = getDB();
  const target = await db
    .prepare("SELECT id, role FROM users WHERE id = ?")
    .bind(input.userId)
    .first();
  if (!target) return { ok: false, error: "NOT_FOUND" };

  // Guard: at least one permission manager must remain
  const actives = await db.prepare("SELECT id, role FROM users WHERE is_active = 1").all();
  const overrides = await db
    .prepare("SELECT user_id, effect FROM user_permission_overrides WHERE permission = 'permissions:manage'")
    .all();
  const granted = new Set((overrides.results ?? []).filter((o: any) => o.effect === "grant").map((o: any) => o.user_id));
  const denied = new Set((overrides.results ?? []).filter((o: any) => o.effect === "deny").map((o: any) => o.user_id));

  const nextGranted = input.effect === "grant";
  const nextDenied = input.effect === "deny";

  const remaining = (actives.results ?? []).filter((u: any) => {
    if (u.id === input.userId) {
      // apply new effect
      if (nextDenied) return false;
      return u.role === "admin" || nextGranted;
    }
    if (denied.has(u.id)) return false;
    return u.role === "admin" || granted.has(u.id);
  });
  // remove target from count if now denied
  const count = remaining.filter((u: any) => !(u.id === input.userId && nextDenied)).length;
  if (count === 0) {
    return { ok: false, error: "LAST_PERMISSION_MANAGER" };
  }

  const existing = await db
    .prepare("SELECT effect FROM user_permission_overrides WHERE user_id = ? AND permission = ?")
    .bind(input.userId, input.permission)
    .first();

  if (input.effect === "inherit") {
    await db
      .prepare("DELETE FROM user_permission_overrides WHERE user_id = ? AND permission = ?")
      .bind(input.userId, input.permission)
      .run();
  } else {
    await db
      .prepare(
        "INSERT INTO user_permission_overrides (user_id, permission, effect, updated_by, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id, permission) DO UPDATE SET effect = excluded.effect, updated_by = excluded.updated_by, updated_at = excluded.updated_at",
      )
      .bind(input.userId, input.permission, input.effect, ctx.user.id, new Date().toISOString())
      .run();
  }

  await db
    .prepare("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(genId(), ctx.user.id, "permission.override", "user", input.userId, JSON.stringify({ permission: input.permission, effect: existing?.effect ?? "inherit" }), JSON.stringify({ permission: input.permission, effect: input.effect }))
    .run();

  revalidatePath("/", "layout");
  return { ok: true };
}
