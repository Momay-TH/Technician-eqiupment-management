import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersManager, type ManagedUser } from "@/components/settings/users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("settings");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("users:manage")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const { results } = await db
    .prepare(
      "SELECT id, email, username, name, role, is_active, last_login_at, created_at FROM users ORDER BY created_at",
    )
    .all();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("users")}</h2>
        <p className="text-sm text-muted-foreground">{t("addUserHint")}</p>
      </div>
      <UsersManager
        users={(results ?? []) as ManagedUser[]}
        currentUserId={ctx.user.id}
        locale={locale}
        canManagePermissions={ctx.permissions.includes("permissions:manage")}
      />
    </div>
  );
}
