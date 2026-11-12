import { cookies } from "next/headers";
import { getDB } from "@/lib/db";
import { effectivePermissions } from "@/lib/permissions";
import type { PermissionKey, UserRole } from "@/lib/constants";

export type Profile = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  phone: string | null;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthContext = {
  user: { id: string; email?: string | null } | null;
  profile: Profile | null;
  permissions: PermissionKey[];
};

const SESSION_COOKIE = "session";
const SESSION_DAYS = 7;

export async function createSession(userId: string): Promise<string> {
  const db = getDB();
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expires)
    .run();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const db = getDB();
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
    } catch {
      // ignore
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return { user: null, profile: null, permissions: [] };

  let db;
  try {
    db = getDB();
  } catch {
    return { user: null, profile: null, permissions: [] };
  }

  const row = (await db
    .prepare(
      `SELECT s.id AS sid, s.expires_at, u.id, u.email, u.username, u.name, u.role,
              u.phone, u.is_active, u.last_login_at, u.created_at, u.updated_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .bind(token)
    .first()) as
    | {
        sid: string;
        expires_at: string;
        id: string;
        email: string;
        username: string;
        name: string;
        role: UserRole;
        phone: string | null;
        is_active: number;
        last_login_at: string | null;
        created_at: string;
        updated_at: string;
      }
    | null;

  if (!row) return { user: null, profile: null, permissions: [] };
  if (new Date(row.expires_at) < new Date()) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
    return { user: null, profile: null, permissions: [] };
  }
  if (!row.is_active) return { user: null, profile: null, permissions: [] };

  const overrides = (await db
    .prepare(
      "SELECT permission, effect FROM user_permission_overrides WHERE user_id = ?",
    )
    .bind(row.id)
    .all()) as { results?: { permission: string; effect: "inherit" | "grant" | "deny" }[] };

  const profile: Profile = {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: row.role,
    phone: row.phone,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  const perms = effectivePermissions(
    { role: row.role, is_active: !!row.is_active },
    overrides.results ?? [],
  );

  return { user: { id: row.id, email: row.email }, profile, permissions: perms };
}

export async function requirePermission(key: PermissionKey) {
  const ctx = await getAuthContext();
  if (!ctx.user) throw new Error("UNAUTHENTICATED");
  if (!ctx.profile) throw new Error("ACCOUNT_INACTIVE");
  if (!ctx.permissions.includes(key)) throw new Error("FORBIDDEN");
  return ctx;
}

export function can(permissions: PermissionKey[], key: PermissionKey): boolean {
  return permissions.includes(key);
}
