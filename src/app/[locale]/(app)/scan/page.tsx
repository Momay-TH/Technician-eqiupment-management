import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/auth";
import { ScanClient } from "@/components/qr/scan-client";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("qr");
  const ctx = await getAuthContext();

  if (!ctx.user || !ctx.permissions.includes("equipment:read")) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ScanClient locale={locale} />
    </div>
  );
}
