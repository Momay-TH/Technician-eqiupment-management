"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  createLocationAction,
  setLocationActiveAction,
} from "@/app/[locale]/(app)/locations/actions";
import { LOCATION_TYPE_META, type LocationType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

export type LocationRow = {
  id: string;
  name: string;
  type: LocationType;
  code: string | null;
  is_active: boolean;
};

export function LocationsManager({
  locations,
  locale,
  canManage,
}: {
  locations: LocationRow[];
  locale: string;
  canManage: boolean;
}) {
  const t = useTranslations("locations");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(row: LocationRow) {
    setBusyId(row.id);
    const res = await setLocationActiveAction(row.id, !row.is_active);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(tc("success"));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("add")}
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-background">
        {locations.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">{tc("noData")}</p>
        )}
        {locations.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-0"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="font-medium">{row.name}</span>
              <Badge variant="outline">
                {LOCATION_TYPE_META[row.type]
                  ? locale === "th"
                    ? LOCATION_TYPE_META[row.type].labelTh
                    : LOCATION_TYPE_META[row.type].labelEn
                  : row.type}
              </Badge>
              {row.code && (
                <span className="font-mono text-xs text-muted-foreground">
                  {row.code}
                </span>
              )}
              <Badge variant={row.is_active ? "default" : "secondary"}>
                {row.is_active ? tc("active") : tc("inactive")}
              </Badge>
            </div>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={() => void toggle(row)}
              >
                {row.is_active ? tc("inactive") : tc("active")}
              </Button>
            )}
          </div>
        ))}
      </div>

      <LocationDialog
        open={open}
        onOpenChange={setOpen}
        locale={locale}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function LocationDialog({
  open,
  onOpenChange,
  locale,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  onSaved: () => void;
}) {
  const t = useTranslations("locations");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [type, setType] = useState<LocationType>("warehouse");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createLocationAction({ name, type, code });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setName("");
    setCode("");
    onOpenChange(false);
    toast.success(tc("success"));
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>{t("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>{t("type")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v ?? "warehouse") as LocationType)}
              items={(
                Object.keys(LOCATION_TYPE_META) as LocationType[]
              ).map((key) => ({
                value: key,
                label:
                  locale === "th"
                    ? LOCATION_TYPE_META[key].labelTh
                    : LOCATION_TYPE_META[key].labelEn,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(LOCATION_TYPE_META) as LocationType[]
                ).map((key) => (
                  <SelectItem key={key} value={key}>
                    {locale === "th"
                      ? LOCATION_TYPE_META[key].labelTh
                      : LOCATION_TYPE_META[key].labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tc("code")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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

