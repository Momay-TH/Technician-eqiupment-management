/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QrLabelPrint, type LabelItem } from "@/components/qr/qr-label-print";

export const dynamic = "force-dynamic";

export default async function LabelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("qr");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("qr:print")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const { results } = await db
    .prepare(
      "SELECT e.id, e.asset_code, e.name, e.serial_number, m.name AS model_name, b.name AS brand_name FROM equipment e JOIN models m ON m.id = e.model_id JOIN brands b ON b.id = m.brand_id WHERE e.is_archived = 0 ORDER BY e.asset_code",
    )
    .all();

  const items: LabelItem[] = ((results ?? []) as any[]).map((row) => ({
    id: row.id,
    asset_code: row.asset_code,
    name: row.name,
    serial_number: row.serial_number,
    model_name: row.model_name ?? null,
    brand_name: row.brand_name ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">{t("print")}</h1>
        <p className="text-sm text-muted-foreground">{t("selectToPrint")}</p>
      </div>
      <QrLabelPrint items={items} locale={locale} />
    </div>
  );
}
