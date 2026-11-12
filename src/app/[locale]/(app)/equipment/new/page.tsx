import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/auth";
import { getFormOptions } from "@/lib/equipment-options";
import { EquipmentForm } from "@/components/equipment/equipment-form";

export const dynamic = "force-dynamic";

export default async function NewEquipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const ctx = await getAuthContext();

  if (!ctx.permissions.includes("equipment:create")) {
    redirect(`/${locale}/dashboard`);
  }

  const options = await getFormOptions();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("equipment.add")}</h1>
      <EquipmentForm
        mode="create"
        locale={locale}
        models={options.models}
        locations={options.locations}
        sites={options.sites}
        technicians={options.technicians}
        canEditSerial
        canSeePrice={ctx.permissions.includes("price:read")}
      />
    </div>
  );
}
