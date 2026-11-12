# Technician Equipment Management — MVP v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.
> อัปเดต: 2026-11-09 (แทนที่แผนเดิม)

**Goal:** สร้าง MVP v1 ระบบจัดการอุปกรณ์ช่าง (serialized asset, QR, เบิก–คืน, สถานะ, ผู้ใช้/สิทธิ์รายบุคคล)

**Architecture:** Next.js 14 App Router + Supabase (Postgres/Auth/Storage). สิทธิ์บังคับที่ DB ด้วย `has_permission(uid, key)` ที่รวม role default + per-user override. UI ใช้ shadcn/ui + next-intl.

**Spec:** `docs/superpowers/specs/2026-09-05-technician-equipment-management-design.md`

## Global Constraints

- Next.js 14 App Router, TypeScript strict
- Tailwind + shadcn/ui เท่านั้น
- Supabase เป็น backend เดียว
- ข้อความทั้งหมดผ่าน next-intl (ไทย/อังกฤษ)
- Mobile-first responsive + PWA
- RLS เปิดทุกตาราง; สิทธิ์ต้องบังคับที่ DB

---

## Task 1: Scaffold + Dependencies

**Files:** `package.json`, `next.config.mjs`, `.env.local.example`, `components.json`

- [ ] Scaffold: `cmd /c "npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias @/* --use-npm"`
- [ ] ติดตั้ง: `@supabase/supabase-js @supabase/ssr next-intl html5-qrcode recharts lucide-react clsx tailwind-merge class-variance-authority zod`
- [ ] `npx shadcn@latest init` (New York, Slate, CSS vars)
- [ ] add components: button card dialog input label select table badge dropdown-menu avatar separator sheet tabs textarea form calendar popover command checkbox switch tooltip alert-dialog skeleton
- [ ] `.env.local.example` + `.env.local`
- [ ] commit

## Task 2: Database Schema + RLS + Permission Engine

**Files:** `supabase/migrations/0001_init.sql`, `supabase/seed.sql`, `src/lib/supabase/{client,server,middleware}.ts`, `src/types/database.ts`

- [ ] enum: user_role, equipment_status, history_action, checkout_status, checkout_item_status, location_type, permission_effect
- [ ] tables: permissions, users, user_permission_overrides, audit_logs, categories, device_types, brands, models, locations, customer_sites, equipment, equipment_status_transitions, equipment_history, checkout_requests, checkout_request_items, notifications
- [ ] `has_permission(uid uuid, key text) returns boolean` — role default map + override, SECURITY DEFINER, STABLE
- [ ] `current_role()` helper
- [ ] RLS policies ทุกตารางโดยใช้ `has_permission`
- [ ] partial unique index: 1 active checkout item ต่อ equipment
- [ ] trigger updated_at
- [ ] seed: permissions 16 รายการ, categories 3, device_types, role transition matrix
- [ ] supabase clients (browser/server)
- [ ] `npx supabase db reset` (ถ้าใช้ local) หรือ apply ผ่าน Supabase SQL editor
- [ ] commit

## Task 3: i18n + Middleware + Auth

**Files:** `src/i18n/{routing,request}.ts`, `messages/{th,en}.json`, `src/middleware.ts`, `src/app/[locale]/login/page.tsx`, `src/app/api/auth/login/route.ts`, `src/lib/auth.ts`

- [ ] next-intl routing (th default, en)
- [ ] middleware: locale + Supabase session refresh + redirect unauthenticated
- [ ] login page: ช่องเดียว email/username + password
- [ ] `/api/auth/login`: รับ identifier+password → ถ้าไม่มี @ เรียก RPC resolve_login_email → signInWithPassword → set cookies
- [ ] RPC `resolve_login_email(identifier text)` SECURITY DEFINER + rate limit (simple table counter)
- [ ] logout
- [ ] commit

## Task 4: App Shell

**Files:** `src/app/[locale]/(app)/layout.tsx`, `src/components/layout/{sidebar,topbar,mobile-nav}.tsx`

- [ ] sidebar menu ตาม permission (`can(key)`)
- [ ] topbar: user, role, language toggle, notifications bell, logout
- [ ] mobile sheet nav
- [ ] commit

## Task 5: Settings — Users / Permissions / Audit

**Files:** `src/app/[locale]/(app)/settings/users/page.tsx`, `.../permissions/page.tsx`, `.../audit/page.tsx`, server actions

- [ ] users list + create/invite + role change + activate/deactivate + reset password + last login
- [ ] guardrails: last permissions:manage, self-deactivate, self-role-demote
- [ ] permissions matrix: inherit/grant/deny per user
- [ ] audit log viewer
- [ ] ทุก mutation เขียน audit_logs
- [ ] commit

## Task 6: Catalog + Locations + Customers

**Files:** settings/catalog, locations, customers pages + forms

- [ ] CRUD categories/device_types/brands/models (archive-only)
- [ ] CRUD locations (warehouse/branch/vehicle)
- [ ] CRUD customer_sites
- [ ] commit

## Task 7: Equipment CRUD + Asset Code

**Files:** `equipment` pages, `src/lib/asset-code.ts`

- [ ] list + search + filter (status/category/brand/location)
- [ ] create: เลือก model, serial, ราคา, vendor, warranty, location, photos; gen asset_code `{SYS}-{TYPE}-{0001}`
- [ ] edit (asset_code/serial locked; serial edit = Admin + audit)
- [ ] detail + history timeline
- [ ] hide price unless `price:read`
- [ ] commit

## Task 8: QR + Labels

**Files:** `src/app/[locale]/e/[assetCode]/page.tsx`, `src/components/qr/*`, print route

- [ ] QR component (encode URL)
- [ ] batch select + PDF export (thermal 50×30, A4 grid)
- [ ] scan page (camera + manual) → find asset
- [ ] commit

## Task 9: Checkout / Return

**Files:** `checkout` pages, server actions

- [ ] create multi-item request (cart) + expected return date + purpose
- [ ] approve/reject (no self-approve, reason on reject)
- [ ] scan handover → status in_vehicle + history
- [ ] return scan + condition → in_stock/under_repair/damaged_pending_dispose
- [ ] overdue list + in-app notification
- [ ] DB constraint 1 active checkout
- [ ] commit

## Task 10: Dashboard + Notifications

- [ ] KPI cards (6 statuses, totals, overdue, pending approvals, warranty expiring)
- [ ] recent activity
- [ ] notification bell + mark read
- [ ] commit

## Task 11: Polish + PWA + Test

- [ ] TH/EN ครบทุกหน้า
- [ ] manifest + icons + installable
- [ ] empty/loading/error states
- [ ] `npm run lint`, `npm run build`
- [ ] seed demo data (optional)
- [ ] commit

---

## Execution Notes

- ใช้ `cmd /c` กับ npx/npm เพราะ PowerShell บล็อก `.ps1`
- ถ้าไม่มี Supabase local (Docker) ให้ apply SQL ผ่าน Supabase dashboard/CLI link
- ทุก task จบด้วย build/lint ผ่านก่อนไปต่อ
