"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  createBrandAction,
  createCategoryAction,
  createDeviceTypeAction,
  createModelAction,
  setBrandArchivedAction,
  setCategoryArchivedAction,
  setDeviceTypeArchivedAction,
  setModelArchivedAction,
} from "@/app/[locale]/(app)/settings/catalog/actions";
import { formatMoney } from "@/lib/format";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, ArchiveRestore, Loader2, Plus } from "lucide-react";

export type CategoryRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_archived: boolean;
};
export type DeviceTypeRow = {
  id: string;
  category_id: string;
  code: string;
  name: string;
  is_archived: boolean;
};
export type BrandRow = { id: string; name: string; is_archived: boolean };
export type ModelRow = {
  id: string;
  brand_id: string;
  device_type_id: string;
  name: string;
  reference_price: number | null;
  is_archived: boolean;
};

export function CatalogManager({
  categories,
  deviceTypes,
  brands,
  models,
  locale,
}: {
  categories: CategoryRow[];
  deviceTypes: DeviceTypeRow[];
  brands: BrandRow[];
  models: ModelRow[];
  locale: string;
}) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const router = useRouter();

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const brandMap = useMemo(
    () => new Map(brands.map((b) => [b.id, b])),
    [brands],
  );
  const deviceTypeMap = useMemo(
    () => new Map(deviceTypes.map((d) => [d.id, d])),
    [deviceTypes],
  );

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deviceTypeOpen, setDeviceTypeOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(
    kind: "category" | "deviceType" | "brand" | "model",
    id: string,
    nextArchived: boolean,
  ) {
    setBusyId(id);
    const action =
      kind === "category"
        ? setCategoryArchivedAction
        : kind === "deviceType"
          ? setDeviceTypeArchivedAction
          : kind === "brand"
            ? setBrandArchivedAction
            : setModelArchivedAction;
    const res = await action(id, nextArchived);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      nextArchived ? t("archivedToast") : t("restoredToast"),
    );
    router.refresh();
  }

  function ArchiveButton({
    kind,
    id,
    isArchived,
  }: {
    kind: "category" | "deviceType" | "brand" | "model";
    id: string;
    isArchived: boolean;
  }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={busyId === id}
        onClick={() => void toggle(kind, id, !isArchived)}
      >
        {isArchived ? (
          <>
            <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
            {t("restore")}
          </>
        ) : (
          <>
            <Archive className="mr-1 h-3.5 w-3.5" />
            {t("archive")}
          </>
        )}
      </Button>
    );
  }

  function SectionHeader({
    title,
    onAdd,
  }: {
    title: string;
    onAdd: () => void;
  }) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {tc("add")}
        </Button>
      </div>
    );
  }

  function Row({
    children,
    isArchived,
    actions,
  }: {
    children: React.ReactNode;
    isArchived: boolean;
    actions: React.ReactNode;
  }) {
    return (
      <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm">
        <div
          className={
            isArchived
              ? "flex min-w-0 flex-1 flex-wrap items-center gap-2 opacity-60"
              : "flex min-w-0 flex-1 flex-wrap items-center gap-2"
          }
        >
          {children}
        </div>
        <div className="flex items-center gap-1">
          {isArchived && (
            <Badge variant="secondary">{t("archived")}</Badge>
          )}
          {actions}
        </div>
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="categories" className="space-y-3">
        <TabsList>
          <TabsTrigger value="categories">{t("categories")}</TabsTrigger>
          <TabsTrigger value="deviceTypes">{t("deviceTypes")}</TabsTrigger>
          <TabsTrigger value="brands">{t("brands")}</TabsTrigger>
          <TabsTrigger value="models">{t("models")}</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <div className="rounded-lg border bg-background">
            <SectionHeader
              title={t("categories")}
              onAdd={() => setCategoryOpen(true)}
            />
            {categories.length === 0 && (
              <p className="border-t px-4 py-6 text-sm text-muted-foreground">
                {t("empty")}
              </p>
            )}
            {categories.map((c) => (
              <Row
                key={c.id}
                isArchived={c.is_archived}
                actions={
                  <ArchiveButton
                    kind="category"
                    id={c.id}
                    isArchived={c.is_archived}
                  />
                }
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {c.code}
                </span>
                <span className="font-medium">{c.name}</span>
                {c.description && (
                  <span className="truncate text-xs text-muted-foreground">
                    {c.description}
                  </span>
                )}
              </Row>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deviceTypes">
          <div className="rounded-lg border bg-background">
            <SectionHeader
              title={t("deviceTypes")}
              onAdd={() => setDeviceTypeOpen(true)}
            />
            {deviceTypes.length === 0 && (
              <p className="border-t px-4 py-6 text-sm text-muted-foreground">
                {t("empty")}
              </p>
            )}
            {deviceTypes.map((d) => (
              <Row
                key={d.id}
                isArchived={d.is_archived}
                actions={
                  <ArchiveButton
                    kind="deviceType"
                    id={d.id}
                    isArchived={d.is_archived}
                  />
                }
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {d.code}
                </span>
                <span className="font-medium">{d.name}</span>
                <Badge variant="outline">
                  {categoryMap.get(d.category_id)?.name ?? "-"}
                </Badge>
              </Row>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="brands">
          <div className="rounded-lg border bg-background">
            <SectionHeader title={t("brands")} onAdd={() => setBrandOpen(true)} />
            {brands.length === 0 && (
              <p className="border-t px-4 py-6 text-sm text-muted-foreground">
                {t("empty")}
              </p>
            )}
            {brands.map((b) => (
              <Row
                key={b.id}
                isArchived={b.is_archived}
                actions={
                  <ArchiveButton
                    kind="brand"
                    id={b.id}
                    isArchived={b.is_archived}
                  />
                }
              >
                <span className="font-medium">{b.name}</span>
              </Row>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="models">
          <div className="rounded-lg border bg-background">
            <SectionHeader title={t("models")} onAdd={() => setModelOpen(true)} />
            {models.length === 0 && (
              <p className="border-t px-4 py-6 text-sm text-muted-foreground">
                {t("empty")}
              </p>
            )}
            {models.map((m) => (
              <Row
                key={m.id}
                isArchived={m.is_archived}
                actions={
                  <ArchiveButton
                    kind="model"
                    id={m.id}
                    isArchived={m.is_archived}
                  />
                }
              >
                <span className="font-medium">
                  {brandMap.get(m.brand_id)?.name ?? "-"} {m.name}
                </span>
                <Badge variant="outline">
                  {deviceTypeMap.get(m.device_type_id)?.name ?? "-"}
                </Badge>
                {m.reference_price != null && (
                  <span className="text-xs text-muted-foreground">
                    {formatMoney(m.reference_price, locale)}
                  </span>
                )}
              </Row>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CategoryDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        onSaved={() => router.refresh()}
      />
      <DeviceTypeDialog
        open={deviceTypeOpen}
        onOpenChange={setDeviceTypeOpen}
        categories={categories.filter((c) => !c.is_archived)}
        onSaved={() => router.refresh()}
      />
      <BrandDialog
        open={brandOpen}
        onOpenChange={setBrandOpen}
        onSaved={() => router.refresh()}
      />
      <ModelDialog
        open={modelOpen}
        onOpenChange={setModelOpen}
        brands={brands.filter((b) => !b.is_archived)}
        deviceTypes={deviceTypes.filter((d) => !d.is_archived)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

function useSaved(onSaved: () => void) {
  const t = useTranslations("catalog");
  return () => {
    toast.success(t("created"));
    onSaved();
  };
}

function CategoryDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const notifySaved = useSaved(onSaved);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createCategoryAction({ code, name, description });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCode("");
    setName("");
    setDescription("");
    onOpenChange(false);
    notifySaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addCategory")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>{tc("code")}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CCTV"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>{tc("details")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

function DeviceTypeDialog({
  open,
  onOpenChange,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRow[];
  onSaved: () => void;
}) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const notifySaved = useSaved(onSaved);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createDeviceTypeAction({ categoryId, code, name });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCode("");
    setName("");
    onOpenChange(false);
    notifySaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addDeviceType")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>{t("selectCategory")}</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tc("code")}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CAM"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
            <Button type="submit" disabled={saving || !categoryId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BrandDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const notifySaved = useSaved(onSaved);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createBrandAction({ name });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setName("");
    onOpenChange(false);
    notifySaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addBrand")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
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

function ModelDialog({
  open,
  onOpenChange,
  brands,
  deviceTypes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandRow[];
  deviceTypes: DeviceTypeRow[];
  onSaved: () => void;
}) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const notifySaved = useSaved(onSaved);
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [deviceTypeId, setDeviceTypeId] = useState(deviceTypes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createModelAction({
      brandId,
      deviceTypeId,
      name,
      referencePrice: price ? Number(price) : null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setName("");
    setPrice("");
    onOpenChange(false);
    notifySaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addModel")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>{t("selectBrand")}</Label>
            <Select value={brandId} onValueChange={(v) => setBrandId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectBrand")} />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("selectDeviceType")}</Label>
            <Select
              value={deviceTypeId}
              onValueChange={(v) => setDeviceTypeId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectDeviceType")} />
              </SelectTrigger>
              <SelectContent>
                {deviceTypes.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tc("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>{t("referencePrice")}</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
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
            <Button
              type="submit"
              disabled={saving || !brandId || !deviceTypeId}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
