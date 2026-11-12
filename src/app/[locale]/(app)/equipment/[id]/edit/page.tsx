/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getFormOptions } from "@/lib/equipment-options";
import { EquipmentForm } from "@/components/equipment/equipment-form";
import type { EquipmentInitial } from "@/components/equipment/equipment-form";

export const dynamic = "force-dynamic";

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("equipment");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("equipment:update")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const eq = (await db
    .prepare(
      "SELECT id, asset_code, serial_number, name, model_id, status, location_id, customer_site_id, assigned_to, purchase_date, purchase_price, vendor, warranty_months, installed_at, installed_by, notes, image_urls, receipt_url FROM equipment WHERE id = ?",
    )
    .bind(id)
    .first()) as any;

  if (!eq) notFound();

  const { models, locations, sites, technicians } = await getFormOptions();

  const initial: EquipmentInitial = {
    id: eq.id,
    asset_code: eq.asset_code,
    serial_number: eq.serial_number,
    name: eq.name,
    model_id: eq.model_id,
    status: eq.status,
    location_id: eq.location_id,
    customer_site_id: eq.customer_site_id,
    assigned_to: eq.assigned_to,
    purchase_date: eq.purchase_date,
    purchase_price: eq.purchase_price,
    vendor: eq.vendor,
    warranty_months: eq.warranty_months,
    installed_at: eq.installed_at,
    installed_by: eq.installed_by,
    notes: eq.notes,
    image_urls: JSON.parse(eq.image_urls || "[]"),
    receipt_url: eq.receipt_url,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("edit")}</h1>
      <EquipmentForm
        mode="edit"
        locale={locale}
        initial={initial}
        models={models}
        locations={locations}
        sites={sites}
        technicians={technicians}
        canEditSerial={ctx.permissions.includes("equipment:serial_edit")}
        canSeePrice={ctx.permissions.includes("price:read")}
      />
    </div>
  );
}
