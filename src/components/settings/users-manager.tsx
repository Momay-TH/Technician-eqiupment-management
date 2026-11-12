"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  createUserAction,
  resetPasswordAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/app/[locale]/(app)/settings/actions";
import { ROLES, type UserRole } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";

export type ManagedUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

export function UsersManager({
  users,
  currentUserId,
  locale,
  canManagePermissions,
}: {
  users: ManagedUser[];
  currentUserId: string;
  locale: string;
  canManagePermissions: boolean;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();

  const [rows, setRows] = useState<ManagedUser[]>(users);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ManagedUser | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  function errorText(code: string) {
    switch (code) {
      case "EMAIL_TAKEN":
        return t("emailTaken");
      case "USERNAME_TAKEN":
        return t("usernameTaken");
      case "INVALID_USERNAME":
        return t("invalidUsername");
      case "WEAK_PASSWORD":
        return t("weakPassword");
      case "LAST_ADMIN":
        return t("cannotLastAdmin");
      case "LAST_PERMISSION_MANAGER":
        return t("lastPermissionManager");
      case "SELF_DEACTIVATE":
        return t("cannotSelfDeactivate");
      case "NOT_CONFIGURED":
        return t("notConfigured");
      default:
        return t("actionFailed", { code });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function changeRole(user: ManagedUser, role: UserRole) {
    if (role === user.role) return;
    setBusyId(user.id);
    const res = await updateUserRoleAction(user.id, role);
    setBusyId(null);
    if (!res.ok) {
      toast.error(errorText(res.error));
      return;
    }
    setRows((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role } : u)),
    );
    toast.success(t("userUpdated"));
    router.refresh();
  }

  async function toggleActive(user: ManagedUser) {
    setBusyId(user.id);
    const res = await setUserActiveAction(user.id, !user.is_active);
    setBusyId(null);
    if (!res.ok) {
      toast.error(errorText(res.error));
      return;
    }
    setRows((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, is_active: !u.is_active } : u,
      ),
    );
    toast.success(user.is_active ? t("userDeactivated") : t("userActivated"));
    router.refresh();
  }

  return (    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("searchUsers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addUser")}
        </Button>
      </div>

      <div className="hidden rounded-lg border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("name")}</TableHead>
              <TableHead>{tc("email")}</TableHead>
              <TableHead>{tc("role")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead>{t("lastLogin")}</TableHead>
              <TableHead className="text-right">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t("noUsers")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    @{user.username}
                    {user.id === currentUserId && (
                      <span className="ml-1 text-primary">
                        ({t("you")})
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(v) =>
                      void changeRole(user, (v ?? user.role) as UserRole)
                    }
                    disabled={busyId === user.id}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {locale === "th" ? r.labelTh : r.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "secondary"}>
                    {user.is_active ? tc("active") : tc("inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.last_login_at
                    ? formatDateTime(user.last_login_at, locale)
                    : t("lastLoginNever")}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onClick={() => setResetTarget(user)}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t("resetPassword")}
                      </DropdownMenuItem>
                      {canManagePermissions && (
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/${locale}/settings/permissions?user=${user.id}`}
                            />
                          }
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {t("permissionOverrides")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {user.is_active ? (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={user.id === currentUserId}
                          onClick={() => setDeactivateTarget(user)}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          {t("deactivate")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => void toggleActive(user)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          {t("activate")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noUsers")}
          </p>
        )}
        {filtered.map((user) => (
          <Card key={user.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{user.username} · {user.email}
                  </p>
                </div>
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? tc("active") : tc("inactive")}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={user.role}
                  onValueChange={(v) =>
                    void changeRole(user, (v ?? user.role) as UserRole)
                  }
                  disabled={busyId === user.id}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {locale === "th" ? r.labelTh : r.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {t("lastLogin")}:{" "}
                  {user.last_login_at
                    ? formatDateTime(user.last_login_at, locale)
                    : t("lastLoginNever")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResetTarget(user)}
                >
                  <KeyRound className="mr-1 h-3.5 w-3.5" />
                  {t("resetPassword")}
                </Button>
                {canManagePermissions && (
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <Link
                        href={`/${locale}/settings/permissions?user=${user.id}`}
                      />
                    }
                  >
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    {t("permissions")}
                  </Button>
                )}
                {user.is_active ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={user.id === currentUserId}
                    onClick={() => setDeactivateTarget(user)}
                  >
                    <UserX className="mr-1 h-3.5 w-3.5" />
                    {t("deactivate")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void toggleActive(user)}
                  >
                    <UserCheck className="mr-1 h-3.5 w-3.5" />
                    {t("activate")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locale={locale}
        errorText={errorText}
        onCreated={() => {
          router.refresh();
        }}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
        errorText={errorText}
      />

      <AlertDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeactivateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeactivateDesc", {
                name: deactivateTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivateTarget) {
                  const target = deactivateTarget;
                  setDeactivateTarget(null);
                  void toggleActive(target);
                }
              }}
            >
              {t("deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  locale,
  errorText,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  errorText: (code: string) => string;
  onCreated: () => void;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("technician");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setUsername("");
    setName("");
    setRole("technician");
    setPassword("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createUserAction({
      email,
      username,
      name,
      role,
      password,
    });
    setSaving(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    toast.success(t("userCreated"));
    reset();
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addUser")}</DialogTitle>
          <DialogDescription>{t("addUserHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>{tc("name")} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{tc("email")} *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{tc("username")} *</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              pattern={"[a-z0-9._\\-]{3,32}"}
              required
            />
            <p className="text-xs text-muted-foreground">
              a-z 0-9 . _ - (3-32)
            </p>
          </div>
          <div className="space-y-2">
            <Label>{tc("role")}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole((v ?? "technician") as UserRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {locale === "th" ? r.labelTh : r.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tc("password")} *</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("passwordHint")}
            </p>
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("addUser")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  target,
  onClose,
  errorText,
}: {
  target: ManagedUser | null;
  onClose: () => void;
  errorText: (code: string) => string;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    setError(null);
    const res = await resetPasswordAction(target.id, password);
    setSaving(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    toast.success(t("passwordReset"));
    setPassword("");
    onClose();
  }

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) {
          setPassword("");
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("resetPasswordFor", { name: target?.name ?? "" })}
          </DialogTitle>
          <DialogDescription>{t("passwordHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>{t("newPassword")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
