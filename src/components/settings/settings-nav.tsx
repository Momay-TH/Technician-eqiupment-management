"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/providers/permissions-provider";
import type { PermissionKey } from "@/lib/constants";

const ITEMS: { key: string; href: string; permission: PermissionKey }[] = [
  { key: "users", href: "/settings/users", permission: "users:manage" },
  {
    key: "permissions",
    href: "/settings/permissions",
    permission: "permissions:manage",
  },
  { key: "catalog", href: "/settings/catalog", permission: "settings:manage" },
  { key: "audit", href: "/settings/audit", permission: "audit:read" },
];

export function SettingsNav() {
  const t = useTranslations("settings");
  const params = useParams();
  const pathname = usePathname();
  const { can } = usePermissions();
  const locale = params.locale as string;

  const items = ITEMS.filter((item) => can(item.permission));

  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border bg-background p-1">
      {items.map((item) => {
        const href = `/${locale}${item.href}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={item.key}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </div>
  );
}
