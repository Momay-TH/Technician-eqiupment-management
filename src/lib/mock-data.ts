import type { PermissionKey, UserRole, EquipmentStatus } from "@/lib/constants";

export const MOCK_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@example.com",
  username: "admin",
  name: "ผู้ดูแลระบบ (ตัวอย่าง)",
  role: "admin" as UserRole,
};

export const MOCK_PERMISSIONS: PermissionKey[] = [
  "equipment:read",
  "equipment:create",
  "equipment:update",
  "equipment:archive",
  "equipment:serial_edit",
  "price:read",
  "qr:print",
  "checkout:create",
  "checkout:approve",
  "checkout:return",
  "checkout:read_all",
  "reports:read",
  "users:manage",
  "permissions:manage",
  "settings:manage",
  "audit:read",
];

export type MockEquipment = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  status: EquipmentStatus;
  model_name: string;
  brand_name: string;
  location_name: string;
  purchase_price: number;
};

export const MOCK_EQUIPMENT: MockEquipment[] = [
  { id: "e1", asset_code: "CCTV-CAM-0001", serial_number: "SN-CAM-001", name: "กล้อง Dome 4MP", status: "in_stock", model_name: "DS-2CD2143G2", brand_name: "Hikvision", location_name: "คลังหลัก", purchase_price: 4500 },
  { id: "e2", asset_code: "CCTV-CAM-0002", serial_number: "SN-CAM-002", name: "กล้อง Bullet 4MP", status: "in_vehicle", model_name: "DS-2CD2043G2", brand_name: "Hikvision", location_name: "รถบริการ 1", purchase_price: 4200 },
  { id: "e3", asset_code: "CCTV-NVR-0001", serial_number: "SN-NVR-001", name: "NVR 16 ช่อง", status: "at_site", model_name: "DS-7616NI", brand_name: "Hikvision", location_name: "ไซต์ A", purchase_price: 18000 },
  { id: "e4", asset_code: "CCTV-DVR-0001", serial_number: "SN-DVR-001", name: "DVR 8 ช่อง", status: "under_repair", model_name: "DS-7208HQHI", brand_name: "Hikvision", location_name: "คลังหลัก", purchase_price: 6500 },
  { id: "e5", asset_code: "ACC-PANEL-0001", serial_number: "SN-PNL-001", name: "Control Panel", status: "in_stock", model_name: "AC-100", brand_name: "ZKTeco", location_name: "คลังหลัก", purchase_price: 9800 },
  { id: "e6", asset_code: "ACC-READER-0001", serial_number: "SN-RDR-001", name: "Card Reader", status: "at_site", model_name: "FR-1200", brand_name: "ZKTeco", location_name: "ไซต์ B", purchase_price: 2400 },
  { id: "e7", asset_code: "ALM-APANEL-0001", serial_number: "SN-APNL-001", name: "Alarm Panel", status: "damaged_pending_dispose", model_name: "AP-200", brand_name: "DSC", location_name: "คลังหลัก", purchase_price: 7500 },
  { id: "e8", asset_code: "ALM-MOTION-0001", serial_number: "SN-MOT-001", name: "Motion Sensor", status: "disposed", model_name: "MS-10", brand_name: "DSC", location_name: "คลังหลัก", purchase_price: 1200 },
];

export type MockUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
};

export const MOCK_USERS: MockUser[] = [
  { id: "u1", name: "ผู้ดูแลระบบ", username: "admin", email: "admin@example.com", role: "admin", is_active: true, last_login_at: "2026-09-05T08:30:00+07:00" },
  { id: "u2", name: "สมชาย จัดการ", username: "manager1", email: "manager@example.com", role: "manager", is_active: true, last_login_at: "2026-09-04T14:00:00+07:00" },
  { id: "u3", name: "ช่างสมศรี", username: "tech1", email: "tech@example.com", role: "technician", is_active: true, last_login_at: "2026-09-03T09:15:00+07:00" },
  { id: "u4", name: "ผู้ชมระบบ", username: "viewer1", email: "viewer@example.com", role: "viewer", is_active: false, last_login_at: null },
];

export const MOCK_CHECKOUTS = [
  { id: "c1", code: "CO-2026-0001", status: "pending" as const, requestedBy: "ช่างสมศรี", purpose: "ติดตั้งกล้องไซต์ A", expectedReturnDate: "2026-09-12", created_at: "2026-09-05T09:00:00+07:00", items: ["CCTV-CAM-0001", "CCTV-CAM-0002"] },
  { id: "c2", code: "CO-2026-0002", status: "approved" as const, requestedBy: "ช่างสมศรี", purpose: "ซ่อมบำรุงไซต์ B", expectedReturnDate: "2026-09-08", created_at: "2026-09-04T10:00:00+07:00", items: ["ACC-READER-0001"] },
  { id: "c3", code: "CO-2026-0003", status: "completed" as const, requestedBy: "ช่างสมศรี", purpose: "ทดสอบ", expectedReturnDate: "2026-09-01", created_at: "2026-09-02T11:00:00+07:00", items: ["CCTV-DVR-0001"] },
];

export const MOCK_AUDIT = [
  { id: "a1", action: "user.create", actor: "ผู้ดูแลระบบ", target: "user:u3", before: null, after: { role: "technician" }, created_at: "2026-09-05T09:30:00+07:00" },
  { id: "a2", action: "checkout.approve", actor: "สมชาย จัดการ", target: "checkout_request:c2", before: { status: "pending" }, after: { status: "approved" }, created_at: "2026-09-04T11:00:00+07:00" },
  { id: "a3", action: "equipment.serial_edit", actor: "ผู้ดูแลระบบ", target: "equipment:e1", before: { serial_number: "OLD-SN" }, after: { serial_number: "SN-CAM-001" }, created_at: "2026-09-03T15:20:00+07:00" },
  { id: "a4", action: "catalog.model_create", actor: "ผู้ดูแลระบบ", target: "model:m1", before: null, after: { name: "DS-2CD2143G2" }, created_at: "2026-09-02T10:00:00+07:00" },
  { id: "a5", action: "location.create", actor: "ผู้ดูแลระบบ", target: "location:l1", before: null, after: { name: "คลังหลัก" }, created_at: "2026-09-01T08:00:00+07:00" },
];

export const MOCK_NOTIFICATIONS = [
  { id: "n1", title: "มีคำขอเบิกอุปกรณ์ใหม่", body: "ใบเบิก CO-2026-0001 รอการอนุมัติ", is_read: false, created_at: "2026-09-05T09:05:00+07:00" },
  { id: "n2", title: "คำขอเบิกได้รับอนุมัติ", body: "ใบเบิก CO-2026-0002 ได้รับอนุมัติแล้ว", is_read: true, created_at: "2026-09-04T11:05:00+07:00" },
  { id: "n3", title: "คำขอเบิกถูกปฏิเสธ", body: "ใบเบิก CO-2026-0003: ข้อมูลไม่ครบ", is_read: true, created_at: "2026-09-03T16:00:00+07:00" },
];
