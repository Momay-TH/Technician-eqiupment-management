/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/components/providers/permissions-provider";
import type { PermissionKey } from "@/lib/constants";
import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Package,
  ScanLine,
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  MapPin,
  Building2,
  BarChart3,
  Users,
  ShieldCheck,
  Database,
  ScrollText,
  Settings,
  ChevronRight,
} from "lucide-react";

type NavItem = {
  key: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  anyOf?: PermissionKey[];
  always?: boolean;
};

const MAIN_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, always: true },
  { key: "equipment", href: "/equipment", icon: Package, anyOf: ["equipment:read"] },
  { key: "scan", href: "/scan", icon: ScanLine, anyOf: ["equipment:read"] },
  { key: "checkout", href: "/checkout", icon: ArrowLeftRight, anyOf: ["checkout:create", "checkout:approve", "checkout:read_all"] },
  { key: "kits", href: "/kits", icon: Boxes, anyOf: ["equipment:read"] },
  { key: "stocktake", href: "/stocktake", icon: ClipboardCheck, anyOf: ["equipment:read"] },
  { key: "locations", href: "/locations", icon: MapPin, anyOf: ["equipment:read"] },
  { key: "customers", href: "/customers", icon: Building2, anyOf: ["equipment:read"] },
  { key: "reports", href: "/reports", icon: BarChart3, anyOf: ["reports:read"] },
];

const SETTINGS_ITEMS: NavItem[] = [
  { key: "users", href: "/settings/users", icon: Users, anyOf: ["users:manage"] },
  {
    key: "permissions",
    href: "/settings/permissions",
    icon: ShieldCheck,
    anyOf: ["permissions:manage"],
  },
  { key: "catalog", href: "/settings/catalog", icon: Database, anyOf: ["settings:manage"] },
  { key: "audit", href: "/settings/audit", icon: ScrollText, anyOf: ["audit:read"] },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const params = useParams();
  const pathname = usePathname();
  const { can } = usePermissions();
  const locale = params.locale as string;

  const allowed = (item: NavItem) =>
    item.always || (item.anyOf ?? []).some((p) => can(p));

  const main = MAIN_ITEMS.filter(allowed);
  const settings = SETTINGS_ITEMS.filter(allowed);

  const renderItem = (item: NavItem) => {
    const href = `/${locale}${item.href}`;
    const active = pathname === href || pathname.startsWith(`${href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.key}
        href={href}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{t(item.key)}</span>
        {active && <ChevronRight className="ml-auto h-4 w-4 opacity-70" />}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Settings className="h-5 w-5 text-primary" />
        <span className="truncate text-sm font-semibold">{t("brand")}</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {main.map(renderItem)}
        {settings.length > 0 && (
          <>
            <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("settings")}
            </div>
            {settings.map(renderItem)}
          </>
        )}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        MVP v1
      </div>
    </div>
  );
}
