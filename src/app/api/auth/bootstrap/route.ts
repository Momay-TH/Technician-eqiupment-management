import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "@/lib/db";
import { hashPassword } from "@/lib/password";

// One-time bootstrap: creates the first admin if no users exist.
// Disabled once any user exists. In production a BOOTSTRAP_TOKEN secret is required.
function bootstrapToken(): string | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as { BOOTSTRAP_TOKEN?: string }).BOOTSTRAP_TOKEN;
  } catch {
    return process.env.BOOTSTRAP_TOKEN;
  }
}

export async function POST(request: Request) {
  const expected = bootstrapToken();
  const provided = request.headers.get("x-bootstrap-token") ?? "";

  if (expected) {
    if (provided !== expected) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Refuse to expose a public "create the first admin" endpoint in production.
    return NextResponse.json({ error: "BOOTSTRAP_TOKEN_REQUIRED" }, { status: 403 });
  }

  let body: { email?: string; username?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const username = (body.username ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const password = body.password ?? "";

  if (!email.includes("@") || !name || !username || password.length < 8) {
    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  }

  const db = getDB();
  const existing = (await db.prepare("SELECT COUNT(*) AS c FROM users").first()) as { c: number } | null;
  if ((existing?.c ?? 0) > 0) {
    return NextResponse.json({ error: "ALREADY_BOOTSTRAPPED" }, { status: 403 });
  }

  const id = crypto.randomUUID();
  const hash = await hashPassword(password);
  await db
    .prepare("INSERT INTO users (id, email, username, name, role, password_hash, is_active) VALUES (?, ?, ?, ?, 'admin', ?, 1)")
    .bind(id, email, username, name, hash)
    .run();

  return NextResponse.json({ ok: true, id });
}
