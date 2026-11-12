"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createEquipmentAction,
  updateEquipmentAction,
  uploadEquipmentFileAction,
  type EquipmentInput,
} from "@/app/[locale]/(app)/equipment/actions";
import type { ModelOption, SimpleOption } from "@/lib/equipment-options";
import { STATUS_META, type EquipmentStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, X } from "lucide-react";

export type EquipmentInitial = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  model_id: string;
  status: EquipmentStatus;
  location_id: string | null;
  customer_site_id: string | null;
  assigned_to: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  vendor: string | null;
  warranty_months: number | null;
  installed_at: string | null;
  installed_by: string | null;
  notes: string | null;
  image_urls: string[] | null;
  receipt_url: string | null;
};

const NONE = "__none__";

export function EquipmentForm({
  mode,
  locale,
  initial,
  models,
  locations,
  sites,
  technicians,
  canEditSerial,
  canSeePrice,
}: {
  mode: "create" | "edit";
  locale: string;
  initial?: EquipmentInitial;
  models: ModelOption[];
  locations: SimpleOption[];
  sites: SimpleOption[];
  technicians: SimpleOption[];
  canEditSerial: boolean;
  canSeePrice: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [serial, setSerial] = useState(initial?.serial_number ?? "");
  const [modelId, setModelId] = useState(initial?.model_id ?? "");
  const [status, setStatus] = useState<EquipmentStatus>(
    initial?.status ?? "in_stock",
  );
  const [locationId, setLocationId] = useState(initial?.location_id ?? NONE);
  const [siteId, setSiteId] = useState(initial?.customer_site_id ?? NONE);
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to ?? NONE);
  const [purchaseDate, setPurchaseDate] = useState(
    initial?.purchase_date ?? "",
  );
  const [price, setPrice] = useState<string>(
    initial?.purchase_price != null ? String(initial.purchase_price) : "",
  );
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [warranty, setWarranty] = useState<string>(
    initial?.warranty_months != null ? String(initial.warranty_months) : "",
  );
  const [installedAt, setInstalledAt] = useState(initial?.installed_at ?? "");
  const [installedBy, setInstalledBy] = useState(initial?.installed_by ?? NONE);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [images, setImages] = useState<string[]>(initial?.image_urls ?? []);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedModels = useMemo(
    () =>
      [...models].sort((a, b) =>
        `${a.categoryName} ${a.deviceTypeName} ${a.brandName} ${a.name}`.localeCompare(
          `${b.categoryName} ${b.deviceTypeName} ${b.brandName} ${b.name}`,
        ),
      ),
    [models],
  );

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const next = [...images];
    let failed = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadEquipmentFileAction(fd);
      if (res.ok) {
        next.push(res.url);
      } else {
        failed += 1;
        if (res.error === "STORAGE_NOT_CONFIGURED") {
          setError(t("errors.storageNotConfigured"));
        }
      }
    }
    if (failed > 0 && failed === files.length) {
      setError((prev) => prev ?? t("errors.uploadFailed"));
    }
    setImages(next);
    setUploading(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !serial.trim() || !modelId) {
      setError(t("errors.generic"));
      return;
    }

    const payload: EquipmentInput = {
      name,
      serial_number: serial,
      model_id: modelId,
      status,
      location_id: locationId === NONE ? null : locationId,
      customer_site_id: siteId === NONE ? null : siteId,
      assigned_to: assignedTo === NONE ? null : assignedTo,
      purchase_date: purchaseDate || null,
      purchase_price: price ? Number(price) : null,
      vendor: vendor || null,
      warranty_months: warranty ? Number(warranty) : null,
      installed_at: installedAt || null,
      installed_by: installedBy === NONE ? null : installedBy,
      notes: notes || null,
      image_urls: images,
    };

    setSaving(true);

    if (mode === "create") {
      const res = await createEquipmentAction(payload);
      if (!res.ok) {
        setSaving(false);
        setError(res.error);
        return;
      }
      router.push(`/${locale}/equipment/${res.id}`);
      router.refresh();
    } else if (initial) {
      const res = await updateEquipmentAction(initial.id, payload);
      if (!res.ok) {
        setSaving(false);
        setError(
          res.error === "SERIAL_FORBIDDEN"
            ? t("equipment.serialLocked")
            : res.error,
        );
        return;
      }
      router.push(`/${locale}/equipment/${initial.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? t("equipment.add") : t("equipment.edit")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "edit" && initial && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {t("equipment.assetCode")}:
              </span>{" "}
              <span className="font-mono font-medium">{initial.asset_code}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("equipment.name")} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("equipment.serialNumber")} *</Label>
              <Input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                required
                disabled={mode === "edit" && !canEditSerial}
              />
              {mode === "edit" && !canEditSerial && (
                <p className="text-xs text-muted-foreground">
                  {t("equipment.serialLocked")}
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t("equipment.model")} *</Label>
              <Select value={modelId} onValueChange={(v) => setModelId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("equipment.selectModel")} />
                </SelectTrigger>
                <SelectContent>
                  {sortedModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {[m.categoryName, m.deviceTypeName, m.brandName, m.name]
                        .filter(Boolean)
                        .join(" · ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus((v ?? "in_stock") as EquipmentStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_META.map((s) => (
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
              <Label>{t("equipment.assignedTo")}</Label>
              <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? NONE)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("equipment.selectTechnician")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {technicians.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("equipment.purchaseDate")}</Label>
              <Input
                type="date"
                value={purchaseDate ?? ""}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            {canSeePrice && (
              <div className="space-y-2">
                <Label>{t("equipment.price")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("equipment.vendor")}</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t("equipment.warrantyMonths")}</Label>
              <Input
                type="number"
                min="0"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("equipment.installedAt")}</Label>
              <Input
                type="date"
                value={installedAt ?? ""}
                onChange={(e) => setInstalledAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("equipment.installedBy")}</Label>
              <Select value={installedBy} onValueChange={(v) => setInstalledBy(v ?? NONE)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("equipment.selectTechnician")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {technicians.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("equipment.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("equipment.photos")}</Label>
            <div className="flex flex-wrap items-center gap-3">
              {images.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-16 w-16 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                    onClick={() => setImages(images.filter((i) => i !== url))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)}
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
