import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAuthContext, destroySession } from "@/lib/auth";
import { getDB } from "@/lib/db";
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

  const db = getDB();
  const canApproveOrReadAll =
    permissions.includes("checkout:approve") ||
    permissions.includes("checkout:read_all");

  let pendingCheckoutCount = 0;
  if (canApproveOrReadAll) {
    const r = (await db
      .prepare("SELECT COUNT(*) AS c FROM checkout_requests WHERE status = 'pending'")
      .first()) as { c: number } | null;
    pendingCheckoutCount = r?.c ?? 0;
  }

  const unreadNotif = (await db
    .prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0")
    .bind(profile.id)
    .first()) as { c: number } | null;

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
      <AppShell
        pendingCheckoutCount={pendingCheckoutCount}
        unreadNotificationCount={unreadNotif?.c ?? 0}
      >
        {children}
      </AppShell>
    </PermissionsProvider>
  );
}
