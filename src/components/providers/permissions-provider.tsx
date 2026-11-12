"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PermissionKey, UserRole } from "@/lib/constants";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
};

type PermissionsContextValue = {
  user: SessionUser;
  permissions: PermissionKey[];
  can: (key: PermissionKey) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  user,
  permissions,
  children,
}: {
  user: SessionUser;
  permissions: PermissionKey[];
  children: ReactNode;
}) {
  const value: PermissionsContextValue = {
    user,
    permissions,
    can: (key) => permissions.includes(key),
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return ctx;
}
