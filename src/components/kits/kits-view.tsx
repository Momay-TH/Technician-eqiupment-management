"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export type KitItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  items: {
    modelName: string;
    brandName: string;
    quantity: number;
    sampleAssetCodes: string[];
  }[];
};

export const SAMPLE_KITS: KitItem[] = [
  {
    id: "kit-1",
    code: "KIT-CCTV-4CH",
    name: "ชุดติดตั้ง CCTV 4 ช่อง (Standard 4MP)",
    description: "ชุดพื้นฐานสำหรับติดตั้งบ้านพักหรือร้านค้าขนาดเล็ก พร้อมกล้อง 4 ตัว และ NVR",
    category: "CCTV",
    items: [
      { modelName: "DS-7616NI", brandName: "Hikvision", quantity: 1, sampleAssetCodes: ["CCTV-NVR-0001"] },
      { modelName: "DS-2CD2143G2", brandName: "Hikvision", quantity: 2, sampleAssetCodes: ["CCTV-CAM-0001"] },
      { modelName: "DS-2CD2043G2", brandName: "Hikvision", quantity: 2, sampleAssetCodes: ["CCTV-CAM-0002"] },
    ],
  },
  {
    id: "kit-2",
    code: "KIT-ACC-1DOOR",
    name: "ชุดติดตั้ง Access Control ควบคุม 1 ประตู",
    description: "ชุดควบคุมประตู Access Control พร้อมเครื่องทาบบัตรและกลอนไฟฟ้า",
    category: "Access Control",
    items: [
      { modelName: "AC-100", brandName: "ZKTeco", quantity: 1, sampleAssetCodes: ["ACC-PANEL-0001"] },
      { modelName: "FR-1200", brandName: "ZKTeco", quantity: 1, sampleAssetCodes: ["ACC-READER-0001"] },
    ],
  },
  {
    id: "kit-3",
    code: "KIT-ALM-STARTER",
    name: "ชุดสัญญาณกันขโมยบ้านพักอาศัย (Alarm Starter)",
    description: "แผงควบคุม Alarm Panel พร้อมตัวตรวจจับความเคลื่อนไหว 2 โซน",
    category: "Alarm",
    items: [
      { modelName: "AP-200", brandName: "DSC", quantity: 1, sampleAssetCodes: ["ALM-APANEL-0001"] },
      { modelName: "MS-10", brandName: "DSC", quantity: 2, sampleAssetCodes: ["ALM-MOTION-0001"] },
    ],
  },
];

export function KitsView({ locale }: { locale: string }) {
  void locale;
  const t = useTranslations("kits");

  const handleCheckoutKit = (kit: KitItem) => {
    toast.success(t("checkoutSuccess"), {
      description: `เพิ่มอุปกรณ์ใน ${kit.name} เข้าสู่คำขอเบิกแล้ว`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <Badge variant="secondary">Phase 3</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addKit")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_KITS.map((kit) => (
          <Card key={kit.id} className="flex flex-col justify-between hover:border-primary/50 transition-colors">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">
                  {kit.code}
                </Badge>
                <Badge variant="secondary">{kit.category}</Badge>
              </div>
              <CardTitle className="text-lg">{kit.name}</CardTitle>
              <CardDescription>{kit.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{t("itemsList")}</p>
                <div className="space-y-1.5">
                  {kit.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2">
                        {item.brandName} - {item.modelName}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  className="w-full"
                  onClick={() => handleCheckoutKit(kit)}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {t("selectToCheckout")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
