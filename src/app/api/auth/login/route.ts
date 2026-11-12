import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";

const RATE_LIMIT_WINDOW_MINUTES = 5;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

export async function POST(request: Request) {
  let body: { identifier?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  const identifier = (body.identifier ?? "").trim();
  const password = body.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  let db;
  try {
    db = getDB();
  } catch {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  // Rate limit by identifier
  const since = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { results: attempts } = await db
    .prepare(
      "SELECT COUNT(*) AS c FROM login_attempts WHERE identifier = ? AND created_at >= ?",
    )
    .bind(identifier.toLowerCase(), since)
    .all();

  const count = (attempts as { c: number }[])?.[0]?.c ?? 0;
  if (count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  await db
    .prepare("INSERT INTO login_attempts (identifier) VALUES (?)")
    .bind(identifier.toLowerCase())
    .run();

  // Resolve username -> email
  const user = (await db
    .prepare(
      "SELECT id, email, password_hash, is_active FROM users WHERE (lower(email) = lower(?) OR lower(username) = lower(?)) AND is_active = 1",
    )
    .bind(identifier, identifier)
    .first()) as
    | { id: string; email: string; password_hash: string; is_active: number }
    | null;

  if (!user) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  // Update last login
  await db
    .prepare("UPDATE users SET last_login_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), user.id)
    .run();

  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
