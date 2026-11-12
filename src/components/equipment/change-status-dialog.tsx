"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { changeStatusAction } from "@/app/[locale]/(app)/equipment/actions";
import { STATUS_META, type EquipmentStatus } from "@/lib/constants";
import type { SimpleOption } from "@/lib/equipment-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";

const NONE = "__none__";

export function ChangeStatusDialog({
  equipmentId,
  currentStatus,
  allowedStatuses,
  locations,
  sites,
  locale,
}: {
  equipmentId: string;
  currentStatus: EquipmentStatus;
  allowedStatuses: EquipmentStatus[];
  locations: SimpleOption[];
  sites: SimpleOption[];
  locale: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [locationId, setLocationId] = useState(NONE);
  const [siteId, setSiteId] = useState(NONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!status) return;
    setSaving(true);
    setError(null);
    const res = await changeStatusAction(equipmentId, {
      status: status as EquipmentStatus,
      reason: reason || undefined,
      notes: notes || undefined,
      location_id: locationId === NONE ? null : locationId,
      customer_site_id: siteId === NONE ? null : siteId,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setStatus("");
    setReason("");
    setNotes("");
    router.refresh();
  }

  const options = STATUS_META.filter((s) =>
    allowedStatuses.includes(s.value),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {t("equipment.changeStatus")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("equipment.changeStatus")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("common.status")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={t("equipment.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {locale === "th" ? s.labelTh : s.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("equipment.location")}</Label>
            <Select value={locationId} onValueChange={(v) => setLocationId(v ?? NONE)}>
              <SelectTrigger>
                <SelectValue placeholder={t("equipment.selectLocation")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>-</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("equipment.customerSite")}</Label>
            <Select value={siteId} onValueChange={(v) => setSiteId(v ?? NONE)}>
              <SelectTrigger>
                <SelectValue placeholder={t("equipment.selectSite")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>-</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("common.reason")}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={currentStatus}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("common.note")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button onClick={submit} disabled={saving || !status}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
