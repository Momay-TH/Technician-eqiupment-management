/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CheckoutDetail, type CheckoutDetailData } from "@/components/checkout/checkout-detail";

export const dynamic = "force-dynamic";

export default async function CheckoutDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const ctx = await getAuthContext();
  if (!ctx.user) redirect(`/${locale}/login`);

  const db = getDB();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const req = (await db
    .prepare(
      `SELECT cr.id, cr.code, cr.status, cr.purpose, cr.expected_return_date, cr.rejection_reason, cr.created_at, cr.approved_at, u.name AS requested_by_name, a.name AS approved_by_name FROM checkout_requests cr LEFT JOIN users u ON u.id = cr.requested_by LEFT JOIN users a ON a.id = cr.approved_by WHERE ${isUuid ? "cr.id = ?" : "cr.code = ?"}`,
    )
    .bind(id)
    .first() as any) as any;

  if (!req) notFound();

  const { results: items } = await db
    .prepare(
      "SELECT cri.id, cri.status, cri.checked_out_at, cri.returned_at, cri.condition_on_return, cri.return_notes, e.id AS eq_id, e.asset_code, e.name, e.serial_number, e.status AS eq_status FROM checkout_request_items cri JOIN equipment e ON e.id = cri.equipment_id WHERE cri.request_id = ?",
    )
    .bind(id)
    .all() as { results?: any[] };

  const request: CheckoutDetailData = {
    id: req.id,
    code: req.code,
    status: req.status,
    purpose: req.purpose,
    expected_return_date: req.expected_return_date,
    rejection_reason: req.rejection_reason,
    created_at: req.created_at,
    approved_at: req.approved_at,
    requested_by_user: { name: req.requested_by_name },
    approved_by_user: { name: req.approved_by_name },
    items: (items ?? []).map((it) => ({
      id: it.id,
      status: it.status,
      checked_out_at: it.checked_out_at,
      returned_at: it.returned_at,
      condition_on_return: it.condition_on_return,
      return_notes: it.return_notes,
      equipment: {
        id: it.eq_id,
        asset_code: it.asset_code,
        name: it.name,
        serial_number: it.serial_number,
        status: it.eq_status,
      },
    })),
  };

  const raw = (await db.prepare("SELECT requested_by FROM checkout_requests WHERE id = ?").bind(id).first()) as { requested_by: string } | null;
  const requesterId = raw?.requested_by;
  const requesterMatches = requesterId === ctx.user.id;

  const hasAccess =
    requesterMatches ||
    ctx.permissions.includes("checkout:read_all") ||
    ctx.permissions.includes("checkout:approve");
  if (!hasAccess) redirect(`/${locale}/checkout`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" render={<Link href={`/${locale}/checkout`} />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">{request.code}</span>
      </div>
      <CheckoutDetail
        request={request}
        locale={locale}
        canApprove={ctx.permissions.includes("checkout:approve")}
        canReturn={ctx.permissions.includes("checkout:return")}
        canCreate={ctx.permissions.includes("checkout:create")}
        isRequester={requesterMatches}
      />
    </div>
  );
}
