import { NextResponse } from "next/server";
import { getStorage } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const ctx = await getAuthContext();
  if (!ctx.user) return new NextResponse("Unauthorized", { status: 401 });

  const { key } = await params;
  const storage = getStorage();
  if (!storage) return new NextResponse("Not configured", { status: 500 });

  const objectKey = key.join("/");
  const obj = await storage.get(objectKey);
  if (!obj) return new NextResponse("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new NextResponse(obj.body, { headers });
}
