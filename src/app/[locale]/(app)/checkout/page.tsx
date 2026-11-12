import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { CHECKOUT_STATUS_META, type CheckoutStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

type ListRow = {
  id: string;
  code: string;
  status: CheckoutStatus;
  purpose: string | null;
  expected_return_date: string | null;
  created_at: string;
  requested_by_name: string | null;
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: statusFilter } = await searchParams;
  const t = await getTranslations("checkout");
  const ctx = await getAuthContext();

  const canAccess =
    ctx.permissions.includes("checkout:create") ||
    ctx.permissions.includes("checkout:approve") ||
    ctx.permissions.includes("checkout:read_all");
  if (!ctx.user || !canAccess) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const validStatus = (["pending", "approved", "rejected", "cancelled", "completed"] as const).includes(
    statusFilter as CheckoutStatus,
  )
    ? (statusFilter as CheckoutStatus)
    : null;

  const { results } = validStatus
    ? await db
        .prepare(
          "SELECT cr.id, cr.code, cr.status, cr.purpose, cr.expected_return_date, cr.created_at, u.name AS requested_by_name FROM checkout_requests cr LEFT JOIN users u ON u.id = cr.requested_by WHERE cr.status = ? ORDER BY cr.created_at DESC LIMIT 100",
        )
        .bind(validStatus)
        .all()
    : await db
        .prepare(
          "SELECT cr.id, cr.code, cr.status, cr.purpose, cr.expected_return_date, cr.created_at, u.name AS requested_by_name FROM checkout_requests cr LEFT JOIN users u ON u.id = cr.requested_by ORDER BY cr.created_at DESC LIMIT 100",
        )
        .all();

  const rows = (results ?? []) as ListRow[];

  const { results: pendingRes } = await db
    .prepare("SELECT COUNT(*) AS c FROM checkout_requests WHERE status = 'pending'")
    .all();
  const pendingTotal = (pendingRes as { c: number }[])?.[0]?.c ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {ctx.permissions.includes("checkout:create") && (
          <Button render={<Link href={`/${locale}/checkout/new`} />}>
            <Plus className="mr-2 h-4 w-4" />
            {t("new")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: locale === "th" ? "ทั้งหมด" : "All", href: `/${locale}/checkout` },
            { key: "pending", label: `${locale === "th" ? CHECKOUT_STATUS_META.pending.labelTh : CHECKOUT_STATUS_META.pending.labelEn} (${pendingTotal})`, href: `/${locale}/checkout?status=pending` },
            { key: "approved", label: locale === "th" ? CHECKOUT_STATUS_META.approved.labelTh : CHECKOUT_STATUS_META.approved.labelEn, href: `/${locale}/checkout?status=approved` },
            { key: "completed", label: locale === "th" ? CHECKOUT_STATUS_META.completed.labelTh : CHECKOUT_STATUS_META.completed.labelEn, href: `/${locale}/checkout?status=completed` },
            { key: "rejected", label: locale === "th" ? CHECKOUT_STATUS_META.rejected.labelTh : CHECKOUT_STATUS_META.rejected.labelEn, href: `/${locale}/checkout?status=rejected` },
          ] as const
        ).map((tab) => {
          const active = (statusFilter ?? "all") === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                  : "rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("noRequests")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const meta = CHECKOUT_STATUS_META[row.status];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const overdue =
              row.status === "approved" &&
              row.expected_return_date != null &&
              new Date(row.expected_return_date) < today;
            return (
              <Link key={row.id} href={`/${locale}/checkout/${row.id}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{row.code}</span>
                        <Badge variant={meta?.variant ?? "outline"}>
                          {locale === "th" ? meta?.labelTh ?? row.status : meta?.labelEn ?? row.status}
                        </Badge>
                        {overdue && <Badge variant="destructive">{t("overdue")}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(row.created_at, locale)}</span>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">{t("requestedBy")}:</span> {row.requested_by_name ?? "-"}
                    </p>
                    {row.purpose && <p className="truncate text-sm text-muted-foreground">{row.purpose}</p>}
                    <p className="text-xs text-muted-foreground">
                      {t("expectedReturnDate")}: {formatDate(row.expected_return_date, locale)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
