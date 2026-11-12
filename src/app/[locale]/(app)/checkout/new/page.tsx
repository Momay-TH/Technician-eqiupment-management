/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckoutCart, type AvailableItem } from "@/components/checkout/checkout-cart";
import type { EquipmentStatus } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NewCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("checkout");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("checkout:create")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const { results: equipment } = await db
    .prepare(
      "SELECT e.id, e.asset_code, e.name, e.serial_number, e.status, m.name AS model_name, b.name AS brand_name, l.name AS location_name FROM equipment e JOIN models m ON m.id = e.model_id JOIN brands b ON b.id = m.brand_id LEFT JOIN locations l ON l.id = e.location_id WHERE e.is_archived = 0 AND e.status IN ('in_stock','in_vehicle','at_site') ORDER BY e.asset_code",
    )
    .all();

  const { results: active } = await db
    .prepare("SELECT equipment_id FROM checkout_request_items WHERE status = 'checked_out'")
    .all();

  const busy = new Set((active ?? []).map((r: any) => r.equipment_id));

  const items: AvailableItem[] = ((equipment ?? []) as any[])
    .filter((row) => !busy.has(row.id))
    .map((row) => ({
      id: row.id,
      asset_code: row.asset_code,
      name: row.name,
      serial_number: row.serial_number,
      status: row.status as EquipmentStatus,
      model_name: row.model_name ?? null,
      brand_name: row.brand_name ?? null,
      location_name: row.location_name ?? null,
    }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("new")}</h1>
      <CheckoutCart items={items} locale={locale} />
    </div>
  );
}
