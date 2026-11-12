import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { DemoClient } from "@/components/demo/demo-client";
import { MOCK_USER, MOCK_PERMISSIONS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PermissionsProvider user={MOCK_USER} permissions={MOCK_PERMISSIONS}>
      <AppShell>
        <DemoClient locale={locale} />
      </AppShell>
    </PermissionsProvider>
  );
}
