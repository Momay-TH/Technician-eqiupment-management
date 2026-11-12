/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { STATUS_META } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatMoney, bangkokDayKey } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const db = getDB();

  const { results: statusRows } = await db
    .prepare(
      `SELECT status, COUNT(*) AS c, COALESCE(SUM(purchase_price), 0) AS total
       FROM equipment
       WHERE is_archived = 0
       GROUP BY status`,
    )
    .all();

  const statusCounts = (statusRows ?? []) as { status: string; c: number; total: number }[];
  const counts: Record<string, number> = {};
  let totalValue = 0;
  for (const s of STATUS_META) {
    const row = statusCounts.find((r) => r.status === s.value);
    counts[s.value] = row?.c ?? 0;
    totalValue += row?.total ?? 0;
  }

  const pendingRes = await db
    .prepare("SELECT COUNT(*) AS c FROM checkout_requests WHERE status = 'pending'")
    .first();

  const overdueRes = await db
    .prepare(
      "SELECT COUNT(*) AS c FROM checkout_requests WHERE status = 'approved' AND expected_return_date < ?",
    )
    .bind(bangkokDayKey(new Date()))
    .first();

  const { results: recent } = await db
    .prepare(
      "SELECT eh.id, eh.action, eh.created_at, e.asset_code, u.name AS actor_name FROM equipment_history eh LEFT JOIN equipment e ON e.id = eh.equipment_id LEFT JOIN users u ON u.id = eh.performed_by ORDER BY eh.created_at DESC LIMIT 8",
    )
    .all();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("dashboard.totalEquipment")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statusCounts.reduce((sum, r) => sum + r.c, 0)}</p>
            <p className="text-xs text-muted-foreground">{formatMoney(totalValue, locale)}</p>
          </CardContent>
        </Card>
        {STATUS_META.map((s) => (
          <Card key={s.value}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {locale === "th" ? s.labelTh : s.labelEn}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{counts[s.value] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
        <Link href={`/${locale}/checkout?status=pending`} className="block">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {t("dashboard.pendingApprovals")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingRes?.c ?? 0}</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t("dashboard.overdueReturns")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overdueRes?.c ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          {(!recent || (recent as any[]).length === 0) && (
            <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
          )}
          <ul className="space-y-2">
            {((recent as any[]) ?? []).map((r: any) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-muted-foreground">{r.asset_code ?? "-"}</span>
                <Badge variant="outline">{r.action}</Badge>
                <span className="text-xs text-muted-foreground">{r.actor_name ?? "-"}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
