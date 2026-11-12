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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
  const { results } = await db
    .prepare(
      "SELECT cr.id, cr.code, cr.status, cr.purpose, cr.expected_return_date, cr.created_at, u.name AS requested_by_name FROM checkout_requests cr LEFT JOIN users u ON u.id = cr.requested_by ORDER BY cr.created_at DESC LIMIT 100",
    )
    .all();

  const rows = (results ?? []) as ListRow[];

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
