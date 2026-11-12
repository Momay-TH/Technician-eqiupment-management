"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  createCustomerSiteAction,
  setCustomerSiteActiveAction,
} from "@/app/[locale]/(app)/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

export type CustomerSiteRow = {
  id: string;
  name: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  is_active: boolean;
};

export function CustomersManager({
  sites,
  canManage,
}: {
  sites: CustomerSiteRow[];
  canManage: boolean;
}) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(row: CustomerSiteRow) {
    setBusyId(row.id);
    const res = await setCustomerSiteActiveAction(row.id, !row.is_active);
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
        {sites.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">{tc("noData")}</p>
        )}
        {sites.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 last:border-0"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.name}</span>
                <Badge variant={row.is_active ? "default" : "secondary"}>
                  {row.is_active ? tc("active") : tc("inactive")}
                </Badge>
              </div>
              {row.address && (
                <p className="text-sm text-muted-foreground">{row.address}</p>
              )}
              {(row.contact_name || row.contact_phone) && (
                <p className="text-xs text-muted-foreground">
                  {row.contact_name ?? "-"}
                  {row.contact_phone ? ` · ${row.contact_phone}` : ""}
                </p>
              )}
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

      <CustomerSiteDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function CustomerSiteDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createCustomerSiteAction({
      name,
      address,
      contactName,
      contactPhone,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setName("");
    setAddress("");
    setContactName("");
    setContactPhone("");
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
            <Label>{t("address")}</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("contactName")}</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("contactPhone")}</Label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
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
