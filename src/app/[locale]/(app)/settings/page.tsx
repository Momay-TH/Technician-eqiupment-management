import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import type { PermissionKey } from "@/lib/constants";

const ORDER: { permission: PermissionKey; tab: string }[] = [
  { permission: "users:manage", tab: "users" },
  { permission: "permissions:manage", tab: "permissions" },
  { permission: "settings:manage", tab: "catalog" },
  { permission: "audit:read", tab: "audit" },
];

export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await getAuthContext();
  const first = ORDER.find((item) => ctx.permissions.includes(item.permission));

  if (!first) redirect(`/${locale}/dashboard`);

  redirect(`/${locale}/settings/${first.tab}`);
}
