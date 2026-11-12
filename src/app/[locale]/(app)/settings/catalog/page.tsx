import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CatalogManager, type BrandRow, type CategoryRow, type DeviceTypeRow, type ModelRow } from "@/components/settings/catalog-manager";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("catalog");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("settings:manage")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const [categoriesRes, deviceTypesRes, brandsRes, modelsRes] = await Promise.all([
    db.prepare("SELECT id, code, name, description, is_archived FROM categories ORDER BY sort_order, name").all(),
    db.prepare("SELECT id, category_id, code, name, is_archived FROM device_types ORDER BY name").all(),
    db.prepare("SELECT id, name, is_archived FROM brands ORDER BY name").all(),
    db.prepare("SELECT id, brand_id, device_type_id, name, reference_price, is_archived FROM models ORDER BY name").all(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CatalogManager
        categories={(categoriesRes.results ?? []) as CategoryRow[]}
        deviceTypes={(deviceTypesRes.results ?? []) as DeviceTypeRow[]}
        brands={(brandsRes.results ?? []) as BrandRow[]}
        models={(modelsRes.results ?? []) as ModelRow[]}
        locale={locale}
      />
    </div>
  );
}
