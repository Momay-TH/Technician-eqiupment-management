import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/equipment/status-badge";
import { QrImage } from "@/components/qr/qr-label-print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AssetQrPage({
  params,
}: {
  params: Promise<{ locale: string; assetCode: string }>;
}) {
  const { locale, assetCode: rawAssetCode } = await params;
  const assetCode = decodeURIComponent(rawAssetCode);
  const t = await getTranslations("equipment");
  const tc = await getTranslations("common");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("equipment:read")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const eq = await db
    .prepare(
      `SELECT e.id, e.asset_code, e.serial_number, e.name, e.status, e.purchase_date, e.purchase_price, e.warranty_months, e.installed_at,
              m.name AS model_name, b.name AS brand_name, dt.name AS device_type_name, c.name AS category_name,
              l.name AS location_name, cs.name AS customer_site_name, cs.address AS customer_site_address,
              u.name AS assigned_user_name
       FROM equipment e
       JOIN models m ON m.id = e.model_id
       JOIN brands b ON b.id = m.brand_id
       JOIN device_types dt ON dt.id = m.device_type_id
       JOIN categories c ON c.id = dt.category_id
       LEFT JOIN locations l ON l.id = e.location_id
       LEFT JOIN customer_sites cs ON cs.id = e.customer_site_id
       LEFT JOIN users u ON u.id = e.assigned_to
       WHERE e.asset_code = ?`,
    )
    .bind(assetCode)
    .first();

  if (!eq) notFound();

  const rows: { label: string; value: string }[] = [
    { label: t("serialNumber"), value: eq.serial_number },
    { label: t("brand"), value: eq.brand_name ?? "-" },
    { label: t("model"), value: eq.model_name ?? "-" },
    { label: t("deviceType"), value: eq.device_type_name ?? "-" },
    { label: t("location"), value: eq.location_name ?? "-" },
    { label: t("customerSite"), value: eq.customer_site_name ?? "-" },
    { label: t("assignedTo"), value: eq.assigned_user_name ?? "-" },
    { label: t("purchaseDate"), value: formatDate(eq.purchase_date, locale) },
    { label: t("warrantyMonths"), value: String(eq.warranty_months ?? "-") },
    { label: t("installedAt"), value: formatDate(eq.installed_at, locale) },
  ];

  const canSeePrice = ctx.permissions.includes("price:read");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" render={<Link href={`/${locale}/equipment`} />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">{t("assetCode")}</span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0">
            <p className="font-mono text-sm text-muted-foreground">{eq.asset_code}</p>
            <CardTitle className="mt-1 text-xl">{eq.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {[eq.brand_name, eq.model_name].filter(Boolean).join(" ")}
            </p>
          </div>
          <StatusBadge status={eq.status} locale={locale} />
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[160px_1fr]">
          <div className="space-y-2">
            <QrImage value={`/${locale}/e/${encodeURIComponent(eq.asset_code)}`} />
            <p className="text-center text-xs text-muted-foreground">{eq.asset_code}</p>
          </div>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 border-b py-1.5 text-sm last:border-0">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium">{row.value}</span>
              </div>
            ))}
            {canSeePrice && (
              <div className="flex items-start justify-between gap-4 border-b py-1.5 text-sm last:border-0">
                <span className="text-muted-foreground">{t("price")}</span>
                <span className="text-right font-medium">{formatMoney(eq.purchase_price, locale)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href={`/${locale}/equipment/${eq.id}`} />}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {tc("details")}
        </Button>
        <Button variant="outline" render={<Link href={`/${locale}/equipment/labels`} />}>
          {t("assetCode")}
        </Button>
      </div>
    </div>
  );
}
