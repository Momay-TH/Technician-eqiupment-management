"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/equipment/status-badge";
import { formatMoney, formatDate } from "@/lib/format";
import { downloadCSV } from "@/lib/csv-export";
import { Download, Package, ArrowLeftRight, ClockAlert, TrendingDown, ShieldAlert } from "lucide-react";
import type { EquipmentStatus } from "@/lib/constants";

export type ReportEquipmentItem = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  status: EquipmentStatus;
  category_name?: string | null;
  brand_name?: string | null;
  model_name?: string | null;
  location_name?: string | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  warranty_expire_date?: string | null;
};

export type ReportCheckoutItem = {
  id: string;
  code: string;
  status: string;
  requested_by_name: string;
  purpose: string;
  expected_return_date: string;
  created_at: string;
  item_count: number;
};

export function ReportsView({
  locale,
  equipment,
  checkouts,
}: {
  locale: string;
  equipment: ReportEquipmentItem[];
  checkouts: ReportCheckoutItem[];
}) {
  const t = useTranslations("reports");
  const te = useTranslations("equipment");
  const tco = useTranslations("checkout");

  const [activeTab, setActiveTab] = useState("inventory");

  // Report 1: Inventory by Status / Location / Category
  const exportInventory = () => {
    const headers = [
      "Asset Code",
      "Serial Number",
      "Name",
      "Status",
      "Category",
      "Brand",
      "Model",
      "Location",
      "Price (THB)",
    ];
    const rows = equipment.map((e) => [
      e.asset_code,
      e.serial_number,
      e.name,
      e.status,
      e.category_name ?? "-",
      e.brand_name ?? "-",
      e.model_name ?? "-",
      e.location_name ?? "-",
      e.purchase_price ?? 0,
    ]);
    downloadCSV("inventory_report", headers, rows);
  };

  // Report 2: Checkouts by Period / Technician
  const exportCheckouts = () => {
    const headers = [
      "Checkout Code",
      "Status",
      "Requested By",
      "Purpose",
      "Expected Return",
      "Created At",
      "Item Count",
    ];
    const rows = checkouts.map((c) => [
      c.code,
      c.status,
      c.requested_by_name,
      c.purpose,
      c.expected_return_date,
      formatDate(c.created_at, locale),
      c.item_count,
    ]);
    downloadCSV("checkouts_report", headers, rows);
  };

  // Report 3: Overdue
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueItems = checkouts.filter(
    (c) => c.status === "approved" && c.expected_return_date < todayStr,
  );

  const exportOverdue = () => {
    const headers = [
      "Checkout Code",
      "Requested By",
      "Purpose",
      "Expected Return",
      "Days Overdue",
      "Items Count",
    ];
    const rows = overdueItems.map((c) => {
      const diff = Math.floor(
        (new Date(todayStr).getTime() - new Date(c.expected_return_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return [
        c.code,
        c.requested_by_name,
        c.purpose,
        c.expected_return_date,
        diff,
        c.item_count,
      ];
    });
    downloadCSV("overdue_report", headers, rows);
  };

  // Report 4: Asset Value & Depreciation (Straight Line 5 Years, 20%/year)
  const calculateDepreciation = (price: number | null | undefined, purchaseDate?: string | null) => {
    const cost = price ?? 0;
    if (!cost || !purchaseDate) {
      return { cost, ageYears: 0, depreciation: 0, bookValue: cost };
    }
    const pDate = new Date(purchaseDate);
    const ageYears = Math.max(
      0,
      (new Date().getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    );
    const rate = 0.2; // 20% per year
    const depreciation = Math.min(cost * 0.99, cost * rate * ageYears);
    const bookValue = Math.max(1, cost - depreciation);
    return {
      cost,
      ageYears: Number(ageYears.toFixed(1)),
      depreciation: Math.round(depreciation),
      bookValue: Math.round(bookValue),
    };
  };

  const exportDepreciation = () => {
    const headers = [
      "Asset Code",
      "Name",
      "Purchase Date",
      "Original Cost (THB)",
      "Age (Years)",
      "Acc. Depreciation (THB)",
      "Book Value (THB)",
    ];
    const rows = equipment.map((e) => {
      const dep = calculateDepreciation(e.purchase_price, e.purchase_date ?? "2024-01-01");
      return [
        e.asset_code,
        e.name,
        e.purchase_date ?? "-",
        dep.cost,
        dep.ageYears,
        dep.depreciation,
        dep.bookValue,
      ];
    });
    downloadCSV("depreciation_report", headers, rows);
  };

  // Report 5: Warranty Expiring Soon (Next 90 Days)
  const expiringWarrantyItems = equipment.filter((e) => {
    if (!e.warranty_expire_date) return false;
    const exp = new Date(e.warranty_expire_date);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90;
  });

  const exportWarranty = () => {
    const headers = [
      "Asset Code",
      "Serial Number",
      "Name",
      "Brand",
      "Location",
      "Warranty Expiry Date",
      "Days Remaining",
    ];
    const rows = expiringWarrantyItems.map((e) => {
      const exp = new Date(e.warranty_expire_date!);
      const now = new Date();
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return [
        e.asset_code,
        e.serial_number,
        e.name,
        e.brand_name ?? "-",
        e.location_name ?? "-",
        e.warranty_expire_date,
        diffDays,
      ];
    });
    downloadCSV("warranty_expiry_report", headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <Badge variant="secondary">{t("phase")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="inventory" className="gap-1.5 py-2">
            <Package className="h-4 w-4" />
            <span>{t("tabInventory")}</span>
          </TabsTrigger>
          <TabsTrigger value="checkouts" className="gap-1.5 py-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span>{t("tabCheckouts")}</span>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5 py-2">
            <ClockAlert className="h-4 w-4" />
            <span>{t("tabOverdue")}</span>
            {overdueItems.length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                {overdueItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="depreciation" className="gap-1.5 py-2">
            <TrendingDown className="h-4 w-4" />
            <span>{t("tabDepreciation")}</span>
          </TabsTrigger>
          <TabsTrigger value="warranty" className="gap-1.5 py-2">
            <ShieldAlert className="h-4 w-4" />
            <span>{t("tabWarranty")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Inventory */}
        <TabsContent value="inventory" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{t("report1")}</p>
            <Button size="sm" variant="outline" onClick={exportInventory}>
              <Download className="mr-1.5 h-4 w-4" />
              {t("exportCSV")}
            </Button>
          </div>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{te("assetCode")}</TableHead>
                  <TableHead>{te("name")}</TableHead>
                  <TableHead>{te("status")}</TableHead>
                  <TableHead>{te("location")}</TableHead>
                  <TableHead className="text-right">{te("price")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.slice(0, 10).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-medium">{item.asset_code}</TableCell>
                    <TableCell>
                      <div>{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.serial_number}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} locale={locale} />
                    </TableCell>
                    <TableCell>{item.location_name ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(item.purchase_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 2: Checkouts */}
        <TabsContent value="checkouts" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{t("report2")}</p>
            <Button size="sm" variant="outline" onClick={exportCheckouts}>
              <Download className="mr-1.5 h-4 w-4" />
              {t("exportCSV")}
            </Button>
          </div>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tco("code")}</TableHead>
                  <TableHead>{tco("requestedBy")}</TableHead>
                  <TableHead>{tco("purpose")}</TableHead>
                  <TableHead>{tco("expectedReturnDate")}</TableHead>
                  <TableHead className="text-center">{tco("items")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkouts.slice(0, 10).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>{c.requested_by_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.purpose}</TableCell>
                    <TableCell>{c.expected_return_date}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{c.item_count}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 3: Overdue */}
        <TabsContent value="overdue" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{t("report3")}</p>
            <Button size="sm" variant="outline" onClick={exportOverdue} disabled={overdueItems.length === 0}>
              <Download className="mr-1.5 h-4 w-4" />
              {t("exportCSV")}
            </Button>
          </div>
          {overdueItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                ไม่มีอุปกรณ์ที่ค้างส่งคืนเกินกำหนด 🎉
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tco("code")}</TableHead>
                    <TableHead>{tco("requestedBy")}</TableHead>
                    <TableHead>{tco("expectedReturnDate")}</TableHead>
                    <TableHead className="text-center">{t("overdueDays")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueItems.map((c) => {
                    const diff = Math.floor(
                      (new Date(todayStr).getTime() - new Date(c.expected_return_date).getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-medium">{c.code}</TableCell>
                        <TableCell>{c.requested_by_name}</TableCell>
                        <TableCell className="text-destructive font-medium">
                          {c.expected_return_date}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{diff} วัน</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Depreciation */}
        <TabsContent value="depreciation" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{t("report4")}</p>
            <Button size="sm" variant="outline" onClick={exportDepreciation}>
              <Download className="mr-1.5 h-4 w-4" />
              {t("exportCSV")}
            </Button>
          </div>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{te("assetCode")}</TableHead>
                  <TableHead>{te("name")}</TableHead>
                  <TableHead className="text-right">{te("price")}</TableHead>
                  <TableHead className="text-right">{t("annualDepreciation")}</TableHead>
                  <TableHead className="text-right">{t("currentBookValue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.slice(0, 10).map((e) => {
                  const dep = calculateDepreciation(e.purchase_price, e.purchase_date ?? "2024-01-01");
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono font-medium">{e.asset_code}</TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell className="text-right">{formatMoney(dep.cost)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatMoney(Math.round(dep.cost * 0.2))}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatMoney(dep.bookValue)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 5: Warranty */}
        <TabsContent value="warranty" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{t("report5")}</p>
            <Button size="sm" variant="outline" onClick={exportWarranty} disabled={expiringWarrantyItems.length === 0}>
              <Download className="mr-1.5 h-4 w-4" />
              {t("exportCSV")}
            </Button>
          </div>
          {expiringWarrantyItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                ไม่มีอุปกรณ์ที่การรับประกันใกล้หมดอายุใน 90 วันนี้
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{te("assetCode")}</TableHead>
                    <TableHead>{te("name")}</TableHead>
                    <TableHead>{te("warrantyExpireDate")}</TableHead>
                    <TableHead className="text-center">{t("daysRemaining")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringWarrantyItems.map((e) => {
                    const exp = new Date(e.warranty_expire_date!);
                    const now = new Date();
                    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono font-medium">{e.asset_code}</TableCell>
                        <TableCell>{e.name}</TableCell>
                        <TableCell>{e.warranty_expire_date}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={diffDays < 30 ? "destructive" : "secondary"}>
                            {diffDays} วัน
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
