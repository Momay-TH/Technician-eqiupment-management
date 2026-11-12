export type UserRole = "admin" | "manager" | "technician" | "viewer";

export type EquipmentStatus =
  | "in_stock"
  | "in_vehicle"
  | "at_site"
  | "under_repair"
  | "damaged_pending_dispose"
  | "disposed";

export type CheckoutStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed";

export type CheckoutItemStatus =
  | "pending"
  | "checked_out"
  | "returned"
  | "damaged"
  | "lost";

export type LocationType = "warehouse" | "branch" | "vehicle";

export type PermissionEffect = "inherit" | "grant" | "deny";

export type PermissionKey =
  | "equipment:read"
  | "equipment:create"
  | "equipment:update"
  | "equipment:archive"
  | "equipment:serial_edit"
  | "price:read"
  | "qr:print"
  | "checkout:create"
  | "checkout:approve"
  | "checkout:return"
  | "checkout:read_all"
  | "reports:read"
  | "users:manage"
  | "permissions:manage"
  | "settings:manage"
  | "audit:read";

export const PERMISSIONS: {
  key: PermissionKey;
  labelTh: string;
  labelEn: string;
  group: string;
}[] = [
  { key: "equipment:read", labelTh: "ดูอุปกรณ์", labelEn: "View equipment", group: "equipment" },
  { key: "equipment:create", labelTh: "เพิ่มอุปกรณ์", labelEn: "Create equipment", group: "equipment" },
  { key: "equipment:update", labelTh: "แก้ไขอุปกรณ์", labelEn: "Update equipment", group: "equipment" },
  { key: "equipment:archive", labelTh: "เก็บ/จำหน่ายอุปกรณ์", labelEn: "Archive/Dispose", group: "equipment" },
  { key: "equipment:serial_edit", labelTh: "แก้ไข Serial Number", labelEn: "Edit serial number", group: "equipment" },
  { key: "price:read", labelTh: "ดูราคา/มูลค่า", labelEn: "View price/value", group: "equipment" },
  { key: "qr:print", labelTh: "พิมพ์ QR Label", labelEn: "Print QR labels", group: "equipment" },
  { key: "checkout:create", labelTh: "สร้างใบเบิก", labelEn: "Create checkout", group: "checkout" },
  { key: "checkout:approve", labelTh: "อนุมัติใบเบิก", labelEn: "Approve checkout", group: "checkout" },
  { key: "checkout:return", labelTh: "รับคืนอุปกรณ์", labelEn: "Return equipment", group: "checkout" },
  { key: "checkout:read_all", labelTh: "ดูใบเบิกทั้งหมด", labelEn: "View all checkouts", group: "checkout" },
  { key: "reports:read", labelTh: "ดูรายงาน", labelEn: "View reports", group: "reports" },
  { key: "users:manage", labelTh: "จัดการผู้ใช้", labelEn: "Manage users", group: "users" },
  { key: "permissions:manage", labelTh: "จัดการสิทธิ์", labelEn: "Manage permissions", group: "users" },
  { key: "settings:manage", labelTh: "จัดการตั้งค่า/ข้อมูลหลัก", labelEn: "Manage settings", group: "system" },
  { key: "audit:read", labelTh: "ดู Audit Log", labelEn: "View audit log", group: "system" },
];

export const ROLE_DEFAULTS: Record<UserRole, PermissionKey[]> = {
  admin: PERMISSIONS.map((p) => p.key),
  manager: [
    "equipment:read",
    "equipment:create",
    "equipment:update",
    "equipment:archive",
    "price:read",
    "qr:print",
    "checkout:create",
    "checkout:approve",
    "checkout:return",
    "checkout:read_all",
    "reports:read",
    "audit:read",
  ],
  technician: ["equipment:read", "checkout:create", "checkout:return", "reports:read"],
  viewer: ["equipment:read", "reports:read"],
};

export const ROLES: { value: UserRole; labelTh: string; labelEn: string }[] = [
  { value: "admin", labelTh: "ผู้ดูแลระบบ", labelEn: "Admin" },
  { value: "manager", labelTh: "ผู้จัดการ", labelEn: "Manager" },
  { value: "technician", labelTh: "ช่างเทคนิค", labelEn: "Technician" },
  { value: "viewer", labelTh: "ผู้ชม", labelEn: "Viewer" },
];

export const STATUS_META: {
  value: EquipmentStatus;
  labelTh: string;
  labelEn: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  color: string;
}[] = [
  { value: "in_stock", labelTh: "อยู่ในคลัง", labelEn: "In Stock", variant: "default", color: "#22c55e" },
  { value: "in_vehicle", labelTh: "อยู่ในรถ", labelEn: "In Vehicle", variant: "secondary", color: "#eab308" },
  { value: "at_site", labelTh: "อยู่ที่หน้างาน", labelEn: "At Site", variant: "outline", color: "#a855f7" },
  { value: "under_repair", labelTh: "ส่งซ่อม", labelEn: "Under Repair", variant: "destructive", color: "#f97316" },
  { value: "damaged_pending_dispose", labelTh: "ชำรุดรอ Dispose", labelEn: "Damaged (Pending Disposal)", variant: "destructive", color: "#ef4444" },
  { value: "disposed", labelTh: "จำหน่ายแล้ว", labelEn: "Disposed", variant: "secondary", color: "#64748b" },
];

export const CHECKOUT_STATUS_META: Record<
  CheckoutStatus,
  { labelTh: string; labelEn: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { labelTh: "รออนุมัติ", labelEn: "Pending", variant: "outline" },
  approved: { labelTh: "อนุมัติแล้ว", labelEn: "Approved", variant: "default" },
  rejected: { labelTh: "ถูกปฏิเสธ", labelEn: "Rejected", variant: "destructive" },
  cancelled: { labelTh: "ยกเลิก", labelEn: "Cancelled", variant: "secondary" },
  completed: { labelTh: "เสร็จสิ้น", labelEn: "Completed", variant: "secondary" },
};

export const CHECKOUT_ITEM_STATUS_META: Record<
  CheckoutItemStatus,
  { labelTh: string; labelEn: string }
> = {
  pending: { labelTh: "รอส่งมอบ", labelEn: "Pending" },
  checked_out: { labelTh: "เบิกแล้ว", labelEn: "Checked out" },
  returned: { labelTh: "คืนแล้ว", labelEn: "Returned" },
  damaged: { labelTh: "คืนชำรุด", labelEn: "Returned damaged" },
  lost: { labelTh: "สูญหาย", labelEn: "Lost" },
};

export const LOCATION_TYPE_META: Record<
  LocationType,
  { labelTh: string; labelEn: string }
> = {
  warehouse: { labelTh: "คลัง", labelEn: "Warehouse" },
  branch: { labelTh: "ศูนย์/สาขา", labelEn: "Branch" },
  vehicle: { labelTh: "รถ", labelEn: "Vehicle" },
};

export function statusLabel(status: EquipmentStatus, locale: string) {
  const meta = STATUS_META.find((s) => s.value === status);
  if (!meta) return status;
  return locale === "th" ? meta.labelTh : meta.labelEn;
}

export function roleLabel(role: UserRole, locale: string) {
  const meta = ROLES.find((r) => r.value === role);
  if (!meta) return role;
  return locale === "th" ? meta.labelTh : meta.labelEn;
}
