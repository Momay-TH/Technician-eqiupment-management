# Technician Equipment Management System — Design Spec (MVP v1)

> อัปเดตล่าสุด: 2026-11-09 — แทนที่ฉบับ 2026-09-05
> สถานะ: อนุมัติแล้ว เริ่ม MVP v1

## 1. Overview

Web application สำหรับบริหารจัดการอุปกรณ์ของช่างเทคนิค ครอบคลุมระบบ CCTV, Access Control และ Alarm รองรับการติดตามอุปกรณ์รายชิ้น (serialized asset), QR code, การเบิก–คืน, สถานะ, สถานที่, ลูกค้า/ไซต์งาน และสิทธิ์การเข้าใช้งานแบบละเอียดรายบุคคล

หลักการ:
- อุปกรณ์ 1 ชิ้น = 1 record (serialized)
- เริ่ม MVP ขนาดเล็ก แล้วต่อยอดเป็นเฟส
- ทุก action สำคัญมี audit log
- บังคับสิทธิ์ที่ฐานข้อมูล (RLS + `has_permission`) ไม่พึ่ง UI อย่างเดียว

## 2. Tech Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui
- Supabase: PostgreSQL, Auth, Storage, RLS
- next-intl (ไทย/อังกฤษ)
- html5-qrcode (สแกนด้วยกล้อง) + ช่องกรอก manual
- Recharts (dashboard)
- Timezone: Asia/Bangkok, สกุลเงิน THB

## 3. Authentication

- Login ด้วย **Email หรือ Username** ในช่องเดียว
- Username: unique (case-insensitive), 3–32 ตัว, อนุญาต `a-z 0-9 . _ -`, Admin ตั้งให้, ผู้ใช้เปลี่ยนเองไม่ได้ใน MVP
- การ resolve username → email ทำฝั่ง server ผ่าน SECURITY DEFINER function + rate limit แล้วจึง sign-in ด้วย Supabase Auth
- ไม่มี public signup — Admin เป็นผู้ invite/create ผู้ใช้
- Email/password เท่านั้นใน MVP (Google SSO / MFA = Phase 2)

## 4. Roles & Per-user Permission Overrides

- 1 user = 1 role (base default) + override รายบุคคล 3 สถานะ: `inherit` | `grant` | `deny`
- `grant` ให้เกิน role ได้ (เช่น Viewer ได้ `qr:print`)
- บังคับด้วย RLS + SQL function `has_permission(uid, key)`

### Permission catalog (16)

`equipment:read`, `equipment:create`, `equipment:update`, `equipment:archive`, `equipment:serial_edit`, `price:read`, `qr:print`, `checkout:create`, `checkout:approve`, `checkout:return`, `checkout:read_all`, `reports:read`, `users:manage`, `permissions:manage`, `settings:manage`, `audit:read`

### Role defaults

| Permission | Admin | Manager | Technician | Viewer |
|---|---|---|---|---|
| equipment:read | ✅ | ✅ | ✅ | ✅ |
| equipment:create | ✅ | ✅ | ❌ | ❌ |
| equipment:update | ✅ | ✅ | ❌ | ❌ |
| equipment:archive | ✅ | ✅ | ❌ | ❌ |
| equipment:serial_edit | ✅ | ❌ | ❌ | ❌ |
| price:read | ✅ | ✅ | ❌ | ❌ |
| qr:print | ✅ | ✅ | ❌ | ❌ |
| checkout:create | ✅ | ✅ | ✅ | ❌ |
| checkout:return | ✅ | ✅ | ✅ | ❌ |
| checkout:approve | ✅ | ✅ | ❌ | ❌ |
| checkout:read_all | ✅ | ✅ | ❌ | ❌ |
| reports:read | ✅ | ✅ | ✅ | ✅ |
| users:manage | ✅ | ❌ | ❌ | ❌ |
| permissions:manage | ✅ | ❌ | ❌ | ❌ |
| settings:manage | ✅ | ❌ | ❌ | ❌ |
| audit:read | ✅ | ✅ | ❌ | ❌ |

### Guardrails

- ห้ามถอด `users:manage` / `permissions:manage` จากตัวเองถ้าเป็นคนสุดท้าย
- ต้องมี user ที่มี `permissions:manage` อย่างน้อย 1 คนเสมอ
- ห้ามระงับบัญชีตัวเอง
- การฝ่าฝืนต้องได้ error ชัดเจน (DB check + server guard)

## 5. Data Model

### users
- `id` uuid PK → auth.users
- `email` text unique
- `username` citext unique (3–32, pattern)
- `name` text
- `role` enum(admin, manager, technician, viewer)
- `phone` text nullable
- `is_active` boolean default true
- `last_login_at` timestamptz nullable
- `created_at`, `updated_at`

### user_permission_overrides
- `user_id` uuid FK → users
- `permission` text FK → permissions.key
- `effect` enum(inherit, grant, deny)
- PK (user_id, permission)
- `updated_by` uuid, `updated_at`

### permissions
- `key` text PK
- `label_th` text, `label_en` text
- `group` text (equipment/checkout/users/reports/system)

### audit_logs
- `id` uuid
- `actor_id` uuid FK → users
- `action` text (user.create, user.role_change, user.deactivate, permission.override, equipment.serial_edit, ...)
- `target_type` text, `target_id` text
- `before` jsonb, `after` jsonb
- `created_at`

### user_invites (ถ้าใช้ invite flow)
- `id` uuid, `email` citext unique, `role` enum, `invited_by`, `token` text, `expires_at`, `accepted_at`

### categories
- `id` uuid, `name` text, `description`, `icon`, `sort_order`, `is_archived`

### device_types
- `id` uuid, `category_id` FK, `name` text, `is_archived`

### brands
- `id` uuid, `name` text unique, `is_archived`

### models
- `id` uuid, `brand_id` FK, `device_type_id` FK, `name` text, `reference_price` numeric(12,2), `specs` jsonb, `is_archived`

### locations
- `id` uuid, `name` text, `type` enum(warehouse, branch, vehicle), `code` text, `is_active`

### customer_sites
- `id` uuid, `name` text, `address` text, `contact_name`, `contact_phone`, `is_active`

### equipment (asset)
- `id` uuid
- `asset_code` text unique, immutable — pattern `{SYS}-{TYPE}-{0001}` เช่น `CCTV-CAM-0001`
- `serial_number` text, immutable (แก้ได้เฉพาะ Admin + audit)
- `name` text
- `model_id` FK → models
- `status` enum(in_stock, in_vehicle, at_site, under_repair, damaged_pending_dispose, disposed)
- `location_id` FK → locations nullable
- `customer_site_id` FK → customer_sites nullable
- `assigned_to` uuid FK → users nullable
- `purchase_date` date
- `purchase_price` numeric(12,2)
- `vendor` text
- `warranty_months` int
- `installed_at` date nullable
- `installed_by` uuid nullable
- `image_urls` text[]
- `receipt_url` text nullable
- `notes` text
- `is_archived` boolean default false
- `created_at`, `updated_at`

### equipment_status_transitions (configurable)
- `from_status`, `to_status` (enum), `allowed_by_roles` user_role[]
- PK (from_status, to_status)

### status_change_log / equipment_history
- `id`, `equipment_id`, `action`, `from_status`, `to_status`, `from_location`, `to_location`, `from_site`, `to_site`, `from_user`, `to_user`, `notes`, `reason`, `performed_by`, `created_at`

### checkout_requests
- `id` uuid
- `code` text unique (เช่น `CO-2026-0001`)
- `requested_by` uuid FK → users
- `status` enum(pending, approved, rejected, cancelled, completed)
- `purpose` text
- `expected_return_date` date
- `approved_by` uuid nullable, `approved_at`, `rejection_reason`
- `created_at`, `updated_at`

### checkout_request_items
- `id` uuid, `request_id` FK, `equipment_id` FK
- `status` enum(pending, checked_out, returned, damaged, lost)
- `checked_out_at`, `returned_at`, `condition_on_return` text, `return_notes`

### notifications
- `id`, `user_id`, `title`, `body`, `type`, `entity_type`, `entity_id`, `is_read`, `created_at`

## 6. Status Lifecycle

`in_stock` → `in_vehicle` → `at_site` → `under_repair` → `damaged_pending_dispose` → `disposed`

- เปลี่ยนอัตโนมัติตาม flow:
  - อนุมัติ + สแกนส่งมอบ → `in_vehicle`
  - คืนสภาพดี → `in_stock`
  - ติดตั้งที่ customer site → `at_site`
  - คืนชำรุด → `under_repair` หรือ `damaged_pending_dispose`
  - จำหน่าย → `disposed`
- manual override ต้องระบุเหตุผล + บันทึก log
- Admin/Manager ตั้ง allowed transitions ได้
- 1 อุปกรณ์มี active checkout ได้ครั้งเดียว — บังคับด้วย partial unique index

## 7. QR Codes

- QR encode URL `/e/{asset_code}` → เปิดหน้ารายละเอียดด้วยกล้องมือถือทั่วไป
- Batch print PDF: thermal 50×30 มม. + A4 grid (3×8)
- Label: QR + asset code + ชื่อ + serial
- สิทธิ์พิมพ์: `qr:print`
- ช่อง barcode 1D เสริม (optional)

## 8. Pages / Routes

| Route | Access |
|---|---|
| `/[locale]/login` | public |
| `/[locale]/dashboard` | authenticated |
| `/[locale]/equipment` | equipment:read |
| `/[locale]/equipment/new` | equipment:create |
| `/[locale]/equipment/[id]` | equipment:read |
| `/[locale]/equipment/[id]/edit` | equipment:update |
| `/[locale]/e/[assetCode]` | public-ish (auth required) QR target |
| `/[locale]/scan` | authenticated |
| `/[locale]/checkout` | checkout:create / approve / read_all |
| `/[locale]/checkout/new` | checkout:create |
| `/[locale]/checkout/[id]` | checkout:create หรือ checkout:read_all |
| `/[locale]/locations` | equipment:read |
| `/[locale]/customers` | equipment:read |
| `/[locale]/reports` | reports:read (Phase 2 data) |
| `/[locale]/settings/users` | users:manage |
| `/[locale]/settings/permissions` | permissions:manage |
| `/[locale]/settings/catalog` | settings:manage |
| `/[locale]/settings/audit` | audit:read |

## 9. MVP v1 Scope

ทำ:
1. Auth (email/username) + roles + per-user overrides + RLS
2. หน้าจัดการผู้ใช้ / สิทธิ์ / audit
3. Categories / Device types / Brands / Models
4. Asset CRUD + locations + customer sites + รูป/ไฟล์แนบ
5. QR generate + detail page + batch print PDF
6. เบิก–คืน + approval + scan + condition + overdue
7. Status automation + manual override + log
8. Dashboard KPI + recent activity
9. i18n ไทย/อังกฤษ + responsive/PWA ติดตั้งได้

Phase 2 (ยังไม่ทำ):
stocktake sessions, รายงาน 5 ชุด + export, email notifications, offline sync, Google SSO/MFA, kits/bundles, CSV import

## 10. Non-functional

- RLS เปิดทุกตาราง
- Storage bucket สำหรับรูป/ไฟล์ (private + signed URL)
- Rate limit endpoint login/resolve username
- Soft delete/archive เท่านั้น; `disposed` เก็บถาวร
- Audit log สำหรับ role/override/บัญชี/serial edit
- UI ภาษาไทย/อังกฤษ ผ่าน next-intl, ไม่ hardcode ข้อความ
