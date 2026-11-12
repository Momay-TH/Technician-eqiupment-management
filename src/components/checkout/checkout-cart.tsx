"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createCheckoutAction } from "@/app/[locale]/(app)/checkout/actions";
import { StatusBadge } from "@/components/equipment/status-badge";
import type { EquipmentStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";

export type AvailableItem = {
  id: string;
  asset_code: string;
  name: string;
  serial_number: string;
  status: EquipmentStatus;
  model_name: string | null;
  brand_name: string | null;
  location_name: string | null;
};

export function CheckoutCart({
  items,
  locale,
}: {
  items: AvailableItem[];
  locale: string;
}) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [purpose, setPurpose] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.asset_code.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.serial_number.toLowerCase().includes(q),
    );
  }, [items, search]);

  function errorText(code: string) {
    switch (code) {
      case "NO_ITEMS":
      case "ITEM_NOT_AVAILABLE":
        return t("selectFirst");
      case "ITEM_ALREADY_CHECKED_OUT":
        return t("itemNotAvailable");
      default:
        return `${t("selectFirst")} (${code})`;
    }
  }

  async function submit() {
    if (selected.length === 0) {
      setError(t("selectFirst"));
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createCheckoutAction({
      equipmentIds: selected,
      purpose,
      expectedReturnDate: expectedReturnDate || null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    toast.success(t("requestCreated"));
    router.push(`/${locale}/checkout/${res.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">{t("addItems")}</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("selectEquipment")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {tc("noData")}
            </p>
          )}
          {filtered.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <label
                key={item.id}
                className={
                  checked
                    ? "flex cursor-pointer items-center gap-3 rounded-md bg-muted/60 px-3 py-2"
                    : "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/40"
                }
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    setSelected((prev) =>
                      value
                        ? Array.from(new Set([...prev, item.id]))
                        : prev.filter((id) => id !== item.id),
                    )
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {item.asset_code} · {item.serial_number}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.location_name && (
                    <span className="hidden text-xs text-muted-foreground md:inline">
                      {item.location_name}
                    </span>
                  )}
                  <StatusBadge status={item.status} locale={locale} />
                </div>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader>
          <CardTitle className="text-base">
            {t("submitRequest")}{" "}
            <Badge variant="secondary">{selected.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>{t("purpose")}</Label>
            <Textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("expectedReturnDate")}</Label>
            <Input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
            />
          </div>

          {selected.length > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md bg-muted/50 p-2">
              {items
                .filter((i) => selected.includes(i.id))
                .map((i) => (
                  <p key={i.id} className="font-mono text-xs">
                    {i.asset_code}
                  </p>
                ))}
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            onClick={submit}
            disabled={saving || selected.length === 0}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("submitRequest")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
