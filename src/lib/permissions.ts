import type { PermissionKey, UserRole } from "@/lib/constants";

const ROLE_DEFAULTS: Record<UserRole, PermissionKey[]> = {
  admin: [
    "equipment:read", "equipment:create", "equipment:update", "equipment:archive",
    "equipment:serial_edit", "price:read", "qr:print", "checkout:create",
    "checkout:approve", "checkout:return", "checkout:read_all", "reports:read",
    "users:manage", "permissions:manage", "settings:manage", "audit:read",
  ],
  manager: [
    "equipment:read", "equipment:create", "equipment:update", "equipment:archive",
    "price:read", "qr:print", "checkout:create", "checkout:approve",
    "checkout:return", "checkout:read_all", "reports:read", "audit:read",
  ],
  technician: ["equipment:read", "checkout:create", "checkout:return", "reports:read"],
  viewer: ["equipment:read", "reports:read"],
};

export function roleDefaults(role: UserRole): PermissionKey[] {
  return ROLE_DEFAULTS[role] ?? [];
}

export function hasPermission(
  user: { role: UserRole; is_active: boolean } | null,
  overrides: { permission: string; effect: "inherit" | "grant" | "deny" }[],
  key: PermissionKey,
): boolean {
  if (!user || !user.is_active) return false;
  const ov = overrides.find((o) => o.permission === key);
  if (ov?.effect === "deny") return false;
  if (ov?.effect === "grant") return true;
  return roleDefaults(user.role).includes(key);
}

export function effectivePermissions(
  user: { role: UserRole; is_active: boolean } | null,
  overrides: { permission: string; effect: "inherit" | "grant" | "deny" }[],
): PermissionKey[] {
  const all: PermissionKey[] = [
    "equipment:read", "equipment:create", "equipment:update", "equipment:archive",
    "equipment:serial_edit", "price:read", "qr:print", "checkout:create",
    "checkout:approve", "checkout:return", "checkout:read_all", "reports:read",
    "users:manage", "permissions:manage", "settings:manage", "audit:read",
  ];
  return all.filter((k) => hasPermission(user, overrides, k));
}
