"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/equipment/status-badge";
import {
  MOCK_AUDIT,
  MOCK_CHECKOUTS,
  MOCK_EQUIPMENT,
  MOCK_NOTIFICATIONS,
  MOCK_USERS,
} from "@/lib/mock-data";
import { STATUS_META } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  Package,
  Users,
  ShieldCheck,
  ArrowLeftRight,
  ScrollText,
  Bell,
  BarChart3,
  Boxes,
  ClipboardCheck,
} from "lucide-react";
import { ReportsView } from "@/components/reports/reports-view";
import { KitsView } from "@/components/kits/kits-view";
import { StocktakeView } from "@/components/stocktake/stocktake-view";

export function DemoClient({ locale }: { locale: string }) {
  const tc = useTranslations("common");

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const status of STATUS_META) {
      result[status.value] = MOCK_EQUIPMENT.filter(
        (item) => item.status === status.value,
      ).length;
    }
    return result;
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <strong>โหมดตัวอย่าง (Demo)</strong> — ข้อมูลเป็น mockup, ไม่เชื่อมต่อฐานข้อมูล.
        การกดปุ่มบันทึก/แก้ไขจะไม่ทำงาน. ตั้งค่า Cloudflare D1 ใน <code>.env</code> เพื่อใช้งานจริง.
      </div>

      <Tabs defaultValue="dashboard" className="space-y-3">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="dashboard">
            <Package className="mr-1.5 h-4 w-4" />
            ภาพรวม
          </TabsTrigger>
          <TabsTrigger value="equipment">
            <Package className="mr-1.5 h-4 w-4" />
            อุปกรณ์
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-1.5 h-4 w-4" />
            ผู้ใช้
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            สิทธิ์
          </TabsTrigger>
          <TabsTrigger value="checkout">
            <ArrowLeftRight className="mr-1.5 h-4 w-4" />
            เบิก–คืน
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ScrollText className="mr-1.5 h-4 w-4" />
            Audit
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-4 w-4" />
            การแจ้งเตือน
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            รายงาน (Phase 2)
          </TabsTrigger>
          <TabsTrigger value="kits">
            <Boxes className="mr-1.5 h-4 w-4" />
            ชุดอุปกรณ์ (Phase 3)
          </TabsTrigger>
          <TabsTrigger value="stocktake">
            <ClipboardCheck className="mr-1.5 h-4 w-4" />
            ตรวจนับสต็อก (Phase 3)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  อุปกรณ์ทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{MOCK_EQUIPMENT.length}</p>
              </CardContent>
            </Card>
            {STATUS_META.map((status) => (
              <Card key={status.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {locale === "th" ? status.labelTh : status.labelEn}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {counts[status.value] ?? 0}
                  </p>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  ใบเบิกรออนุมัติ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {MOCK_CHECKOUTS.filter((c) => c.status === "pending").length}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipment">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสทรัพย์สิน</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>ยี่ห้อ/รุ่น</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>สถานที่</TableHead>
                    <TableHead className="text-right">ราคา</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_EQUIPMENT.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.asset_code}
                      </TableCell>
                      <TableCell className="text-sm">{item.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.brand_name} {item.model_name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} locale={locale} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.location_name}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatMoney(item.purchase_price, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>บทบาท</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_USERS.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        @{user.username}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? tc("active") : tc("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.last_login_at
                          ? formatDateTime(user.last_login_at, locale)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              ตารางสิทธิ์ (inherit / grant / deny) จะแสดงที่นี่. ดูตัวอย่างเต็มได้ที่
              <code className="mx-1">/settings/permissions</code> (ต้องเชื่อมต่อฐานข้อมูล).
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkout">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ผู้ขอ</TableHead>
                    <TableHead>วัตถุประสงค์</TableHead>
                    <TableHead>กำหนดคืน</TableHead>
                    <TableHead>รายการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CHECKOUTS.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm font-semibold">
                        {row.code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row.requestedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.purpose}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(row.expectedReturnDate, locale)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.items.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เวลา</TableHead>
                    <TableHead>ผู้กระทำ</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_AUDIT.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(row.created_at, locale)}
                      </TableCell>
                      <TableCell className="text-sm">{row.actor}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.target}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-2">
            {MOCK_NOTIFICATIONS.map((row) => (
              <Card
                key={row.id}
                className={row.is_read ? "opacity-70" : "border-primary/30 bg-primary/5"}
              >
                <CardContent className="space-y-1 p-4">
                  <p className="text-sm font-semibold">{row.title}</p>
                  <p className="text-sm text-muted-foreground">{row.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(row.created_at, locale)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="reports">
          <ReportsView
            locale={locale}
            equipment={MOCK_EQUIPMENT.map((e) => ({
              ...e,
              purchase_date: "2024-03-15",
              warranty_expire_date: "2026-12-01",
              category_name: "CCTV",
            }))}
            checkouts={MOCK_CHECKOUTS.map((c) => ({
              id: c.id,
              code: c.code,
              status: c.status,
              requested_by_name: c.requestedBy,
              purpose: c.purpose,
              expected_return_date: c.expectedReturnDate,
              created_at: c.created_at,
              item_count: c.items.length,
            }))}
          />
        </TabsContent>
        <TabsContent value="kits">
          <KitsView locale={locale} />
        </TabsContent>

        <TabsContent value="stocktake">
          <StocktakeView locale={locale} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
