/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { EquipmentStatus } from "@/lib/constants";
import { EquipmentList } from "@/components/equipment/equipment-list";
import type { EquipmentRow } from "@/components/equipment/equipment-list";

export const dynamic = "force-dynamic";

export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("equipment");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("equipment:read")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const { results } = await db
    .prepare(
      `SELECT e.id, e.asset_code, e.serial_number, e.name, e.status, e.purchase_price,
              m.name AS model_name, b.name AS brand_name, l.name AS location_name
       FROM equipment e
       JOIN models m ON m.id = e.model_id
       JOIN brands b ON b.id = m.brand_id
       LEFT JOIN locations l ON l.id = e.location_id
       WHERE e.is_archived = 0
       ORDER BY e.asset_code`,
    )
    .all();

  const rows: EquipmentRow[] = ((results ?? []) as any[]).map((r) => ({
    id: r.id,
    asset_code: r.asset_code,
    serial_number: r.serial_number,
    name: r.name,
    status: r.status as EquipmentStatus,
    model_name: r.model_name,
    brand_name: r.brand_name,
    location_name: r.location_name,
    purchase_price: r.purchase_price,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <EquipmentList
        rows={rows}
        locale={locale}
        canCreate={ctx.permissions.includes("equipment:create")}
        canSeePrice={ctx.permissions.includes("price:read")}
        canPrint={ctx.permissions.includes("qr:print")}
      />
    </div>
  );
}
