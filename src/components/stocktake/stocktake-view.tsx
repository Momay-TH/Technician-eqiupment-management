"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { downloadCSV } from "@/lib/csv-export";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { MOCK_EQUIPMENT } from "@/lib/mock-data";

export function StocktakeView({ locale }: { locale: string }) {
  void locale;
  const t = useTranslations("stocktake");
  const te = useTranslations("equipment");

  const [sessionActive, setSessionActive] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("คลังหลัก");
  const [scanInput, setScanInput] = useState("");
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);

  // อุปกรณ์ทั้งหมดที่ควรอยู่ในสถานที่นี้
  const expectedEquipment = MOCK_EQUIPMENT.filter(
    (e) => e.location_name === selectedLocation,
  );

  // คำนวณผลลัพธ์
  const matchedItems = expectedEquipment.filter((e) =>
    scannedCodes.includes(e.asset_code),
  );
  const missingItems = expectedEquipment.filter(
    (e) => !scannedCodes.includes(e.asset_code),
  );
  const unexpectedCodes = scannedCodes.filter(
    (code) => !expectedEquipment.some((e) => e.asset_code === code),
  );

  const handleStartSession = () => {
    setScannedCodes([]);
    setSessionActive(true);
    toast.success(`เปิดรอบตรวจนับที่: ${selectedLocation}`);
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanInput.trim().toUpperCase();
    if (!code) return;

    if (scannedCodes.includes(code)) {
      toast.info(`สแกนรหัส ${code} ซ้ำแล้ว`);
      setScanInput("");
      return;
    }

    setScannedCodes((prev) => [code, ...prev]);
    setScanInput("");

    if (expectedEquipment.some((item) => item.asset_code === code)) {
      toast.success(`พบอุปกรณ์ ${code} ตรงตามรายการ`);
    } else {
      toast.warning(`อุปกรณ์ ${code} อยู่นอกรายการ หรืออยู่ผิดสถานที่`);
    }
  };

  const handleExportStocktake = () => {
    const headers = ["Asset Code", "Name", "Serial Number", "Status in Stocktake"];
    const rows = [
      ...matchedItems.map((e) => [e.asset_code, e.name, e.serial_number, "MATCHED"]),
      ...missingItems.map((e) => [e.asset_code, e.name, e.serial_number, "MISSING"]),
      ...unexpectedCodes.map((code) => [code, "Unexpected", "-", "UNEXPECTED_MISPLACED"]),
    ];
    downloadCSV(`stocktake_${selectedLocation}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
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

        {sessionActive && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportStocktake}>
              <Download className="mr-1.5 h-4 w-4" />
              {t("exportReport")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setSessionActive(false);
                toast.success(t("sessionCompleted"));
              }}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {t("finishSession")}
            </Button>
          </div>
        )}
      </div>

      {!sessionActive ? (
        <Card className="max-w-lg mx-auto my-8">
          <CardHeader>
            <CardTitle>{t("startSession")}</CardTitle>
            <CardDescription>{t("selectLocation")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedLocation} onValueChange={(val) => { if (val) setSelectedLocation(val); }}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกสถานที่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="คลังหลัก">คลังหลัก (WH-01)</SelectItem>
                <SelectItem value="รถบริการ 1">รถบริการ 1 (VH-01)</SelectItem>
                <SelectItem value="ไซต์ A">ไซต์ A (Site A)</SelectItem>
              </SelectContent>
            </Select>

            <Button className="w-full" onClick={handleStartSession}>
              <Play className="mr-2 h-4 w-4" />
              เริ่มการตรวจนับ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Dashboard Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t("totalExpected")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{expectedEquipment.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("matched")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">{matchedItems.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-destructive flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  {t("missing")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{missingItems.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("unexpected")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{unexpectedCodes.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Scan Barcode / Asset Code Input */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleScan} className="flex gap-2">
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="พิมพ์หรือยิงสแกนเนอร์บาร์โค้ด / Asset Code (เช่น CCTV-CAM-0001)..."
                  className="font-mono text-base"
                  autoFocus
                />
                <Button type="submit">
                  <ScanLine className="mr-1.5 h-4 w-4" />
                  สแกน
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Tables */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* ตรวจพบแล้ว */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("matched")} ({matchedItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{te("assetCode")}</TableHead>
                      <TableHead>{te("name")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">
                          ยังไม่มีรายการที่สแกน
                        </TableCell>
                      </TableRow>
                    ) : (
                      matchedItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono font-medium text-xs">
                            {item.asset_code}
                          </TableCell>
                          <TableCell className="text-xs">{item.name}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* ยังไม่พบ */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {t("missing")} ({missingItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{te("assetCode")}</TableHead>
                      <TableHead>{te("name")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">
                          ครบถ้วนทุกรายการแล้ว 🎉
                        </TableCell>
                      </TableRow>
                    ) : (
                      missingItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono font-medium text-xs text-destructive">
                            {item.asset_code}
                          </TableCell>
                          <TableCell className="text-xs">{item.name}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
