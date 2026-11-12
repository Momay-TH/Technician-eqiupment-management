import { getTranslations } from "next-intl/server";
import { SettingsNav } from "@/components/settings/settings-nav";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("settings");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("userManagement")}</p>
      </div>
      <SettingsNav />
      {children}
    </div>
  );
}
