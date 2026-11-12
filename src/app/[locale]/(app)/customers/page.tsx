import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CustomersManager, type CustomerSiteRow } from "@/components/customers/customers-manager";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("customers");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("equipment:read")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const { results } = await db
    .prepare("SELECT id, name, address, contact_name, contact_phone, is_active FROM customer_sites ORDER BY name")
    .all();

  const canManage =
    ctx.permissions.includes("settings:manage") ||
    ctx.permissions.includes("equipment:update");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CustomersManager
        sites={(results ?? []) as CustomerSiteRow[]}
        canManage={canManage}
      />
    </div>
  );
}
