import { getTranslations } from "next-intl/server";
import { getDB } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PermissionsMatrix, type MatrixUser, type OverrideRow, type PermissionRow } from "@/components/settings/permissions-matrix";
import { PERMISSIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PermissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ user?: string }>;
}) {
  const { locale } = await params;
  const { user: initialUserId } = await searchParams;
  const t = await getTranslations("settings");
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.permissions.includes("permissions:manage")) {
    redirect(`/${locale}/dashboard`);
  }

  const db = getDB();
  const [usersRes, overridesRes] = await Promise.all([
    db.prepare("SELECT id, name, username, role, is_active FROM users ORDER BY is_active DESC, name").all(),
    db.prepare("SELECT user_id, permission, effect FROM user_permission_overrides").all(),
  ]);

  const permissions: PermissionRow[] = PERMISSIONS.map((p) => ({
    key: p.key,
    labelTh: p.labelTh,
    labelEn: p.labelEn,
    group: p.group,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("permissions")}</h2>
        <p className="text-sm text-muted-foreground">{t("permissionsHint")}</p>
      </div>
      <PermissionsMatrix
        users={(usersRes.results ?? []) as MatrixUser[]}
        permissions={permissions}
        overrides={(overridesRes.results ?? []) as OverrideRow[]}
        initialUserId={initialUserId}
        locale={locale}
      />
    </div>
  );
}
