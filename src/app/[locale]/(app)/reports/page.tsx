/* eslint-disable @typescript-eslint/no-explicit-any */
import { setRequestLocale } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsView } from "@/components/reports/reports-view";
import type { ReportEquipmentItem, ReportCheckoutItem } from "@/components/reports/reports-view";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("reports:read")) {
    redirect(`/${locale}/dashboard`);
  }

  let equipmentList: ReportEquipmentItem[] = [];
  let checkoutList: ReportCheckoutItem[] = [];

  try {
    const db = getDB();
    const { results: eq } = await db
      .prepare(
        `SELECT e.id, e.asset_code, e.serial_number, e.name, e.status, e.purchase_price,
                e.purchase_date, e.warranty_months,
                date(e.purchase_date, '+' || e.warranty_months || ' months') AS warranty_expire_date,
                m.name AS model_name, b.name AS brand_name, c.name AS category_name,
                l.name AS location_name
         FROM equipment e
         LEFT JOIN models m ON m.id = e.model_id
         LEFT JOIN brands b ON b.id = m.brand_id
         LEFT JOIN device_types dt ON dt.id = m.device_type_id
         LEFT JOIN categories c ON c.id = dt.category_id
         LEFT JOIN locations l ON l.id = e.location_id
         WHERE e.is_archived = 0
         ORDER BY e.asset_code`,
      )
      .all();

    equipmentList = (eq ?? []) as ReportEquipmentItem[];

    const { results: co } = await db
      .prepare(
        `SELECT cr.id, cr.code, cr.status, cr.purpose, cr.expected_return_date, cr.created_at,
                u.name AS requested_by_name,
                (SELECT COUNT(*) FROM checkout_request_items WHERE request_id = cr.id) AS item_count
         FROM checkout_requests cr
         LEFT JOIN users u ON u.id = cr.requested_by
         ORDER BY cr.created_at DESC`,
      )
      .all();

    checkoutList = (co ?? []) as ReportCheckoutItem[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("reports load failed", err);
  }

  return <ReportsView locale={locale} equipment={equipmentList} checkouts={checkoutList} />;
}
