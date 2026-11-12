/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { formatDate, formatMoney } from "@/lib/format";
import type { EquipmentStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/equipment/status-badge";
import { ChangeStatusDialog } from "@/components/equipment/change-status-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Pencil, ArrowLeft } from "lucide-react";
import type { SimpleOption } from "@/lib/equipment-options";

export const dynamic = "force-dynamic";

type Detail = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  status: EquipmentStatus;
  model_id: string;
  model_name: string | null;
  brand_name: string | null;
  device_type_name: string | null;
  category_name: string | null;
  location_id: string | null;
  location_name: string | null;
  customer_site_id: string | null;
  customer_site_name: string | null;
  assigned_to: string | null;
  assigned_user_name: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  vendor: string | null;
  warranty_months: number | null;
  installed_at: string | null;
  installed_by: string | null;
  notes: string | null;
  image_urls: string;
};

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const ctx = await getAuthContext();
  if (!ctx.permissions.includes("equipment:read")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const eq = (await db
    .prepare(
      `SELECT e.*, m.name AS model_name, b.name AS brand_name, dt.name AS device_type_name, c.name AS category_name,
              l.name AS location_name, cs.name AS customer_site_name, u.name AS assigned_user_name
       FROM equipment e
       JOIN models m ON m.id = e.model_id
       JOIN brands b ON b.id = m.brand_id
       JOIN device_types dt ON dt.id = m.device_type_id
       JOIN categories c ON c.id = dt.category_id
       LEFT JOIN locations l ON l.id = e.location_id
       LEFT JOIN customer_sites cs ON cs.id = e.customer_site_id
       LEFT JOIN users u ON u.id = e.assigned_to
       WHERE e.id = ?`,
    )
    .bind(id)
    .first()) as Detail | null;

  if (!eq) notFound();

  const { results: history } = await db
    .prepare(
      "SELECT eh.*, u.name AS performed_by_name FROM equipment_history eh LEFT JOIN users u ON u.id = eh.performed_by WHERE eh.equipment_id = ? ORDER BY eh.created_at DESC",
    )
    .bind(id)
    .all();

  const { results: transitions } = await db
    .prepare("SELECT to_status FROM equipment_status_transitions WHERE from_status = ?")
    .bind(eq.status)
    .all();

  const { results: locations } = await db
    .prepare("SELECT id, name FROM locations WHERE is_active = 1")
    .all();

  const { results: sites } = await db
    .prepare("SELECT id, name FROM customer_sites WHERE is_active = 1")
    .all();

  const isOwner = eq.assigned_to != null && eq.assigned_to === ctx.user?.id;
  const canChange =
    ctx.permissions.includes("equipment:update") ||
    (isOwner && ctx.permissions.includes("checkout:return"));
  const canSeePrice = ctx.permissions.includes("price:read");
  const allowed = (transitions ?? [])
    .map((r: any) => r.to_status as EquipmentStatus)
    .filter((status: any) =>
      ctx.permissions.includes("equipment:update") ||
      status === "in_stock" ||
      status === "under_repair",
    );

  const rows: { label: string; value: any }[] = [
    { label: t("equipment.assetCode"), value: <span className="font-mono">{eq.asset_code}</span> },
    { label: t("equipment.serialNumber"), value: <span className="font-mono">{eq.serial_number}</span> },
    { label: t("equipment.category"), value: eq.category_name ?? "-" },
    { label: t("equipment.deviceType"), value: eq.device_type_name ?? "-" },
    { label: t("equipment.brand"), value: eq.brand_name ?? "-" },
    { label: t("equipment.model"), value: eq.model_name ?? "-" },
    { label: t("equipment.location"), value: eq.location_name ?? "-" },
    { label: t("equipment.customerSite"), value: eq.customer_site_name ?? "-" },
    { label: t("equipment.assignedTo"), value: eq.assigned_user_name ?? "-" },
    { label: t("equipment.purchaseDate"), value: formatDate(eq.purchase_date, locale) },
    { label: t("equipment.warrantyMonths"), value: eq.warranty_months ?? "-" },
    { label: t("equipment.installedAt"), value: formatDate(eq.installed_at, locale) },
    { label: t("equipment.notes"), value: eq.notes ?? "-" },
  ];

  if (canSeePrice) {
    rows.splice(9, 0, { label: t("equipment.price"), value: formatMoney(eq.purchase_price, locale) });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href={`/${locale}/equipment`} />}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{eq.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">{eq.asset_code}</p>
        </div>
        <StatusBadge status={eq.status} locale={locale} />
        {ctx.permissions.includes("equipment:update") && (
          <Button variant="outline" render={<Link href={`/${locale}/equipment/${eq.id}/edit`} />}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
        )}
        {canChange && allowed.length > 0 && (
          <ChangeStatusDialog
            equipmentId={eq.id}
            currentStatus={eq.status}
            allowedStatuses={allowed}
            locations={(locations ?? []) as SimpleOption[]}
            sites={(sites ?? []) as SimpleOption[]}
            locale={locale}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("common.details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("equipment.history")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(history ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
            ) : (
              <ul className="space-y-3">
                {((history ?? []) as any[]).map((h: any) => (
                  <li key={h.id} className="border-b pb-2 text-sm last:border-0">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{h.action}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(h.created_at, locale)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.from_status ?? "-"} → {h.to_status ?? "-"} · {h.performed_by_name ?? "-"}
                    </p>
                    {h.notes && <p className="text-xs">{h.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
