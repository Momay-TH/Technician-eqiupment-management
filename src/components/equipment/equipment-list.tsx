"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { StatusBadge } from "@/components/equipment/status-badge";
import { STATUS_META, type EquipmentStatus } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { Plus, Printer, Search } from "lucide-react";

export type EquipmentRow = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  status: EquipmentStatus;
  purchase_price: number | null;
  model?: {
    name?: string;
    brand?: { name?: string };
    device_type?: { name?: string; category?: { name?: string } };
  } | null;
  location?: { name?: string } | null;
  assigned_user?: { name?: string } | null;
};

export function EquipmentList({
  rows,
  locale,
  canCreate,
  canSeePrice,
  canPrint,
}: {
  rows: EquipmentRow[];
  locale: string;
  canCreate: boolean;
  canSeePrice: boolean;
  canPrint: boolean;
}) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => r.model?.device_type?.category?.name)
            .filter((v): v is string => Boolean(v)),
        ),
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ =
        !q ||
        r.asset_code.toLowerCase().includes(q) ||
        r.serial_number.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || r.status === status;
      const matchesCategory =
        category === "all" ||
        r.model?.device_type?.category?.name === category;
      return matchesQ && matchesStatus && matchesCategory;
    });
  }, [rows, search, status, category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("equipment.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v ?? "all")}
          items={[
            { value: "all", label: t("equipment.filterStatus") },
            ...STATUS_META.map((s) => ({
              value: s.value,
              label: locale === "th" ? s.labelTh : s.labelEn,
            })),
          ]}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue placeholder={t("equipment.filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("equipment.filterStatus")}</SelectItem>
            {STATUS_META.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {locale === "th" ? s.labelTh : s.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v ?? "all")}
          items={[
            { value: "all", label: t("equipment.filterCategory") },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        >
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder={t("equipment.filterCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("equipment.filterCategory")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canPrint && (
          <Button variant="outline" render={<Link href={`/${locale}/equipment/labels`} />}>
            <Printer className="mr-2 h-4 w-4" />
            {t("qr.print")}
          </Button>
        )}
        {canCreate && (
          <Button render={<Link href={`/${locale}/equipment/new`} />}>
            <Plus className="mr-2 h-4 w-4" />
            {t("equipment.add")}
          </Button>
        )}
      </div>

      <div className="hidden rounded-lg border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("equipment.assetCode")}</TableHead>
              <TableHead>{t("equipment.name")}</TableHead>
              <TableHead>{t("equipment.category")}</TableHead>
              <TableHead>{t("equipment.model")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("equipment.location")}</TableHead>
              {canSeePrice && <TableHead>{t("equipment.price")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canSeePrice ? 7 : 6}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t("equipment.empty")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    className="font-mono text-sm text-primary hover:underline"
                    href={`/${locale}/equipment/${r.id}`}
                  >
                    {r.asset_code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  {r.model?.device_type?.category?.name ?? "-"}
                </TableCell>
                <TableCell>
                  {r.model?.brand?.name
                    ? `${r.model.brand.name} ${r.model.name ?? ""}`
                    : r.model?.name ?? "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} locale={locale} />
                </TableCell>
                <TableCell>{r.location?.name ?? "-"}</TableCell>
                {canSeePrice && (
                  <TableCell>{formatMoney(r.purchase_price, locale)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("equipment.empty")}
          </p>
        )}
        {filtered.map((r) => (
          <Link key={r.id} href={`/${locale}/equipment/${r.id}`}>
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {r.asset_code}
                    </p>
                  </div>
                  <StatusBadge status={r.status} locale={locale} />
                </div>
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    {r.model?.device_type?.category?.name ?? "-"}
                  </Badge>
                  <span>{r.location?.name ?? "-"}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
