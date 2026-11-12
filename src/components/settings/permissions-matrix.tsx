"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setPermissionOverrideAction } from "@/app/[locale]/(app)/settings/actions";
import {
  ROLES,
  ROLE_DEFAULTS,
  type PermissionEffect,
  type PermissionKey,
  type UserRole,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Minus, ShieldAlert, X } from "lucide-react";

export type PermissionRow = {
  key: PermissionKey;
  labelTh: string;
  labelEn: string;
  group: string;
};

export type MatrixUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  is_active: boolean;
};

export type OverrideRow = {
  user_id: string;
  permission: string;
  effect: PermissionEffect;
};

const EFFECTS: PermissionEffect[] = ["inherit", "grant", "deny"];

export function PermissionsMatrix({
  users,
  permissions,
  overrides,
  initialUserId,
  locale,
}: {
  users: MatrixUser[];
  permissions: PermissionRow[];
  overrides: OverrideRow[];
  initialUserId?: string;
  locale: string;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();

  const [selectedId, setSelectedId] = useState(
    initialUserId && users.some((u) => u.id === initialUserId)
      ? initialUserId
      : (users[0]?.id ?? ""),
  );
  const [rows, setRows] = useState<OverrideRow[]>(overrides);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  const overrideMap = useMemo(() => {
    const map = new Map<string, PermissionEffect>();
    for (const o of rows) {
      if (o.user_id === selectedId) map.set(o.permission, o.effect);
    }
    return map;
  }, [rows, selectedId]);

  const roleDefaults = useMemo(() => {
    if (!selectedUser) return new Set<string>();
    return new Set<string>(ROLE_DEFAULTS[selectedUser.role] ?? []);
  }, [selectedUser]);

  function effective(permission: PermissionKey): boolean {
    const override = overrideMap.get(permission);
    if (override === "deny") return false;
    if (override === "grant") return true;
    return roleDefaults.has(permission);
  }

  async function changeEffect(
    permission: PermissionKey,
    effect: PermissionEffect,
  ) {
    if (!selectedUser) return;
    const previous = overrideMap.get(permission) ?? "inherit";
    if (previous === effect) return;

    setSavingKey(`${selectedUser.id}:${permission}`);
    setRows((prev) => {
      const next = prev.filter(
        (r) => !(r.user_id === selectedUser.id && r.permission === permission),
      );
      if (effect !== "inherit") {
        next.push({
          user_id: selectedUser.id,
          permission,
          effect,
        });
      }
      return next;
    });

    const res = await setPermissionOverrideAction({
      userId: selectedUser.id,
      permission,
      effect,
    });
    setSavingKey(null);

    if (!res.ok) {
      // rollback
      setRows((prev) => {
        const next = prev.filter(
          (r) => !(r.user_id === selectedUser.id && r.permission === permission),
        );
        if (previous !== "inherit") {
          next.push({
            user_id: selectedUser.id,
            permission,
            effect: previous,
          });
        }
        return next;
      });
      toast.error(
        res.error === "LAST_PERMISSION_MANAGER"
          ? t("lastPermissionManager")
          : t("actionFailed", { code: res.error }),
      );
      return;
    }

    toast.success(t("permissionsSaved"));
    router.refresh();
  }

  const groups = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const permission of permissions) {
      const list = map.get(permission.group) ?? [];
      list.push(permission);
      map.set(permission.group, list);
    }
    return Array.from(map.entries());
  }, [permissions]);

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("noUsers")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end">
          <div className="w-full space-y-2 md:max-w-sm">
            <Label>{tc("username")}</Label>
            <Select
              value={selectedId}
              onValueChange={(v) => setSelectedId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} (@{u.username}) ·{" "}
                    {(() => {
                      const role = ROLES.find((r) => r.value === u.role);
                      if (!role) return u.role;
                      return locale === "th" ? role.labelTh : role.labelEn;
                    })()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedUser && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={selectedUser.is_active ? "default" : "secondary"}>
                {selectedUser.is_active ? tc("active") : tc("inactive")}
              </Badge>
              <span className="text-muted-foreground">
                {t("roleDefaultsHint")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">{t("permissions")}</th>
              <th className="px-4 py-3">{t("roleDefault")}</th>
              <th className="px-4 py-3">{t("permissionOverrides")}</th>
              <th className="px-4 py-3">{t("effective")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([group, list]) => (
              <Fragment key={`group-${group}`}>
                <tr className="bg-muted/20">
                  <td
                    colSpan={4}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {t(`groups.${group}` as never)}
                  </td>
                </tr>
                {list.map((permission) => {
                  const override = overrideMap.get(permission.key) ?? "inherit";
                  const isEffective = effective(permission.key);
                  const busy = savingKey === `${selectedId}:${permission.key}`;
                  return (
                    <tr key={permission.key} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {locale === "th"
                            ? permission.labelTh
                            : permission.labelEn}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {permission.key}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {roleDefaults.has(permission.key) ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={override}
                          onValueChange={(v) =>
                            void changeEffect(
                              permission.key,
                              (v ?? "inherit") as PermissionEffect,
                            )
                          }
                          disabled={busy}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EFFECTS.map((effect) => (
                              <SelectItem key={effect} value={effect}>
                                {t(effect)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            isEffective
                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {isEffective ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          {isEffective ? t("allowed") : t("denied")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        {t("permissionsHint")}
      </p>
    </div>
  );
}
