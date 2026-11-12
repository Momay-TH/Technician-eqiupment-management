import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAuthContext, destroySession } from "@/lib/auth";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, profile, permissions } = await getAuthContext();

  if (!user) redirect(`/${locale}/login`);

  if (!profile) {
    await destroySession();
    redirect(`/${locale}/login?inactive=1`);
  }

  return (
    <PermissionsProvider
      user={{
        id: profile.id,
        email: profile.email,
        username: profile.username,
        name: profile.name,
        role: profile.role,
      }}
      permissions={permissions}
    >
      <AppShell>{children}</AppShell>
    </PermissionsProvider>
  );
}
