"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Search } from "lucide-react";

export type LabelItem = {
  id: string;
  asset_code: string;
  name: string;
  serial_number: string;
  model_name?: string | null;
  brand_name?: string | null;
};

type Format = "thermal" | "a4";

export function QrLabelPrint({
  items,
  locale,
}: {
  items: LabelItem[];
  locale: string;
}) {
  const t = useTranslations("qr");
  const tc = useTranslations("common");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<Format>("a4");
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

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

  const selectedItems = useMemo(
    () => items.filter((i) => selected.includes(i.id)),
    [items, selected],
  );

  useEffect(() => {
    let cancelled = false;
    const origin =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        : "";

    async function generate() {
      const entries = await Promise.all(
        selectedItems.map(async (item) => {
          const url = `${origin}/${locale}/e/${encodeURIComponent(item.asset_code)}`;
          const dataUrl = await QRCode.toDataURL(url, {
            margin: 1,
            width: 300,
          });
          return [item.id, dataUrl] as const;
        }),
      );
      if (!cancelled) {
        setQrMap((prev) => {
          const next = { ...prev };
          for (const [id, dataUrl] of entries) next[id] = dataUrl;
          return next;
        });
      }
    }

    if (selectedItems.length > 0) void generate();
    return () => {
      cancelled = true;
    };
  }, [selectedItems, locale]);

  function toggleAll(checked: boolean) {
    setSelected(checked ? filtered.map((i) => i.id) : []);
  }

  function print() {
    if (selectedItems.length === 0) return;
    window.print();
  }

  const ready = selectedItems.every((i) => qrMap[i.id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("selectToPrint")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full space-y-2 md:w-56">
          <Label>{t("labelSize")}</Label>
          <Select
            value={format}
            onValueChange={(v) => setFormat((v ?? "a4") as Format)}
            items={[
              { value: "thermal", label: t("thermal") },
              { value: "a4", label: t("a4") },
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thermal">{t("thermal")}</SelectItem>
              <SelectItem value="a4">{t("a4")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={print} disabled={selectedItems.length === 0 || !ready}>
          <Printer className="mr-2 h-4 w-4" />
          {t("print")} ({selectedItems.length})
        </Button>
      </div>

      <div className="rounded-lg border bg-background print:hidden">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Checkbox
            checked={
              filtered.length > 0 && filtered.every((i) => selected.includes(i.id))
            }
            onCheckedChange={(checked) => toggleAll(Boolean(checked))}
          />
          <span className="text-sm font-medium">
            {tc("all")} ({filtered.length})
          </span>
        </div>
        {filtered.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">{tc("noData")}</p>
        )}
        {filtered.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-0 hover:bg-muted/40"
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
              <Badge variant="outline">
                {item.brand_name ?? item.model_name ?? "-"}
              </Badge>
            </label>
          );
        })}
      </div>

      <div ref={printRef} className="print-area hidden print:block">
        {selectedItems.map((item) => (
          <div
            key={item.id}
            className={
              format === "thermal"
                ? "label-thermal flex items-center gap-2 overflow-hidden p-1"
                : "label-a4 inline-flex items-center gap-2 overflow-hidden p-1"
            }
          >
            {qrMap[item.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrMap[item.id]}
                alt={item.asset_code}
                className={
                  format === "thermal" ? "h-[22mm] w-[22mm]" : "h-[20mm] w-[20mm]"
                }
              />
            ) : (
              <div className="h-[22mm] w-[22mm] bg-gray-200" />
            )}
            <div className="min-w-0">
              <p className="font-mono text-[9pt] font-bold leading-tight">
                {item.asset_code}
              </p>
              <p className="text-[8pt] leading-tight">{item.name}</p>
              <p className="font-mono text-[7pt] leading-tight">
                {item.serial_number}
              </p>
              {(item.brand_name || item.model_name) && (
                <p className="text-[7pt] leading-tight">
                  {[item.brand_name, item.model_name].filter(Boolean).join(" ")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QrImage({
  value,
  size = 160,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const finalValue = value.startsWith("/")
      ? `${window.location.origin}${value}`
      : value;
    void QRCode.toDataURL(finalValue, { margin: 1, width: size }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="QR" width={size} height={size} className={className} />
  );
}
