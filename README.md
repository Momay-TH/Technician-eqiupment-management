# Technician Equipment Management

ระบบบริหารจัดการอุปกรณ์ช่าง (CCTV / Access Control / Alarm) — serialized assets, multi-item checkout/return, QR labels, role-based permissions, Thai/English UI.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/Base UI · Cloudflare **D1** (database) · Cloudflare **R2** (files, optional) · next-intl · `@opennextjs/cloudflare` + Wrangler.

> Supabase has been removed completely. Auth is a custom session cookie backed by a `sessions` table in D1 (PBKDF2-SHA256 via Web Crypto). Permissions are enforced in the TypeScript app layer (`src/lib/permissions.ts`) because D1 has no RLS.

---

## Features (MVP v1)

- **Inventory of serialized assets** — one row per physical unit, readable `asset_code` (`CCTV-CAM-0001`), guarded serial number.
- **Catalog** — categories → device types → brands → models, with reference prices.
- **Locations & customers** — warehouses, branches, vehicles, customer sites.
- **Status tracking** — `in_stock`, `in_vehicle`, `at_site`, `under_repair`, `damaged_pending_dispose`, `disposed`, with a history timeline.
- **Checkout / return** — multi-item request, single-level approval (no self-approval), rejection reason, handover and return per item.
- **QR** — generate labels (50×30 mm thermal and A4 3×8), print via browser, scan with camera or type the code.
- **Users & permissions** — admin creates users (no public signup); 16 permissions with `inherit / grant / deny` overrides (**deny > grant > role default**).
- **Audit log** and in-app notifications.
- **Reports** — 5 report sets with CSV export (inventory, checkouts, overdue, depreciation, warranty expiry).
- **PWA** — installable, mobile-first responsive layout.
- **i18n** — Thai / English, Asia/Bangkok timezone, THB currency.

---

## Requirements

- Node.js 20+ (Node 22.5+ recommended: the `.dev/` SQLite fallback uses `node:sqlite`)
- A Cloudflare account (D1 is required, R2 is optional)
- Wrangler (via `npx`, no global install needed)

---

## 1. Environment

```bash
cp .env.local.example .env.local
```

`.env.local` only needs the public URL:

```env
NEXT_PUBLIC_APP_URL=http://localhost:8788
```

Real secrets are **not** stored in `.env.local`; they are set as Worker secrets:

```bash
npx wrangler secret put BOOTSTRAP_TOKEN   # required for the one-time first-admin endpoint
```

`.env.local` is read by `wrangler dev`. Local runtime bindings come from `wrangler.toml` (no separate config needed).

---

## 2. Database (D1)

The schema lives in `migrations/d1`:

- `0001_init.sql` — full SQLite schema (users, sessions, permissions, catalog, equipment, checkout, notifications, audit, `login_attempts`).
- `0002_seed.sql` — 16 permissions, categories, device types, status transitions, default locations.

```bash
# create the database once
npx wrangler d1 create technician-equipment
#   -> copy `database_id` into wrangler.toml

# apply migrations
npm run db:migrate:local     # local D1 (used by `npm run cf:dev`)
npm run db:migrate:remote    # production D1
```

---

## 3. File storage (R2, optional)

Photos/receipts are served from the R2 binding `STORAGE` through `/api/files/[...key]` (auth required).

1. Enable **R2** once in the Cloudflare dashboard (*Storage & Databases → R2*).
2. Create the bucket:

   ```bash
   npx wrangler r2 bucket create technician-equipment-files
   ```

3. Uncomment the `[[r2_buckets]]` block in `wrangler.toml`.

Until this is done, uploads return `STORAGE_NOT_CONFIGURED` and the UI shows a clear message — the rest of the system works normally.

---

## 4. First admin

The first account is created through a one-time endpoint that is permanently disabled once any user exists.

```bash
curl -X POST http://localhost:8788/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-token: <BOOTSTRAP_TOKEN>" \
  -d "{\"email\":\"admin@company.com\",\"username\":\"admin\",\"name\":\"Admin\",\"password\":\"<at-least-8-chars>\"}"
```

- Without a `BOOTSTRAP_TOKEN` secret the endpoint is **refused in production** and allowed only in local development.
- After a user exists it always returns `403 ALREADY_BOOTSTRAPPED`.
- Every further user is created from **Settings → Users** inside the app.

Log in with **email or username** at `/th/login` or `/en/login`.

---

## 5. Run

Two local modes are supported.

### A. `npm run dev` — plain Next.js dev server (no WSL, no VC++ runtime needed)

```bash
npm run dev     # http://localhost:3000
```

When there is no Cloudflare context, the app falls back to a local SQLite database and
filesystem storage under `.dev/` (git-ignored):

- `.dev/d1.sqlite` — created automatically from `migrations/d1/*.sql` on first request.
- `.dev/storage/` — local stand-in for the R2 bucket (photos, receipts).

Reset everything with `rm -rf .dev` (Windows: `rmdir /s /q .dev`) and restart the server.
This fallback is development-only; the Cloudflare build always uses the real `DB` / `STORAGE` bindings.

### B. `npm run cf:dev` — real Wrangler runtime (D1 + R2 bindings)

```bash
npm run cf:build     # build the OpenNext worker (required before cf:dev)
npm run cf:dev       # http://localhost:8788
```

`npm run dev` cannot use the Cloudflare bindings and `cf:dev` cannot use the `.dev/` fallback —
they are separate data stores.

> Do not run `npm run build` / `npm run cf:build` while `npm run dev` is running: both write to
> `.next/` and the dev server will start failing with `Cannot find module './NNNN.js'`.
> Stop the dev server (or delete `.next/`) and start it again.

> **Windows note:** if `wrangler dev` crashes with `access violation` / `stack overflow` (`workerd`),
> use mode A, install the latest **Microsoft Visual C++ Redistributable (x64)** and retry, or run
> Wrangler inside **WSL2**.

---

## 6. Deploy

```bash
npx wrangler secret put BOOTSTRAP_TOKEN   # first time only
npm run db:migrate:remote
npm run cf:deploy
```

Then run the bootstrap request against the production URL once, and verify:

1. Login with email **and** username.
2. Create a user, set role + permission override.
3. Create equipment, edit, change status → confirm history + audit entries.
4. Print QR labels and scan an asset code.
5. Checkout → approve → handover → return → status returns to `in_stock`.
6. Reports render and CSV exports download.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run cf:build` | Build the OpenNext/Cloudflare bundle into `.open-next/` |
| `npm run dev` | Local dev on port 3000 using the `.dev/` SQLite fallback |
| `npm run cf:dev` | Run the app locally on Wrangler (D1/R2 bindings, port 8788) |
| `npm run cf:preview` | Build + run locally in one step |
| `npm run cf:deploy` | Build and deploy the Worker |
| `npm run db:migrate:local` | Apply D1 migrations to the local database |
| `npm run db:migrate:remote` | Apply D1 migrations to production |
| `npm run build` | Plain Next.js build (type/route validation) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

---

## Roles & permissions

| Permission | Admin | Manager | Technician | Viewer |
| --- | :-: | :-: | :-: | :-: |
| `equipment:read` | ✓ | ✓ | ✓ | ✓ |
| `equipment:create` | ✓ | ✓ | | |
| `equipment:update` | ✓ | ✓ | | |
| `equipment:archive` | ✓ | ✓ | | |
| `equipment:serial_edit` | ✓ | | | |
| `price:read` | ✓ | ✓ | | |
| `qr:print` | ✓ | ✓ | | |
| `checkout:create` | ✓ | ✓ | ✓ | |
| `checkout:approve` | ✓ | ✓ | | |
| `checkout:return` | ✓ | ✓ | ✓ | |
| `checkout:read_all` | ✓ | ✓ | | |
| `reports:read` | ✓ | ✓ | ✓ | ✓ |
| `users:manage` | ✓ | | | |
| `permissions:manage` | ✓ | | | |
| `settings:manage` | ✓ | | | |
| `audit:read` | ✓ | ✓ | | |

Admin always has every permission. UI gating is a convenience; server actions re-check permissions before writing.

---

## Project structure

```
src/app/[locale]/(app)/    authenticated routes (dashboard, equipment, checkout, scan, settings, reports, …)
src/app/[locale]/login/    localized login
src/app/[locale]/demo/     DB-free UI preview (no auth)
src/app/api/auth/          login, logout, one-time bootstrap
src/app/api/files/         R2 object streaming (auth required)
src/lib/auth.ts            session cookie auth on D1
src/lib/password.ts        PBKDF2-SHA256 hash/verify
src/lib/permissions.ts     role defaults + override resolution
src/lib/db.ts              getDB() / getStorage() via getCloudflareContext()
src/lib/dev-sqlite.ts      local D1/R2 stand-ins for plain `next dev` (`.dev/`)
migrations/d1/             SQLite schema + seed
docs/legacy/supabase/      archived pre-migration SQL (not used)
messages/                  th.json / en.json
```

---

## Current status

| Area | Status |
| --- | --- |
| Core MVP (auth, equipment, QR, checkout, users, master data, audit) | ✅ Done |
| Reports (5 sets + CSV) | ✅ Done |
| Cloudflare D1 schema + seed (remote) | ✅ Applied |
| Local dev without workerd (`npm run dev` + `.dev/` SQLite) | ✅ Working |
| R2 file storage | ⏳ Awaiting R2 activation on the account |
| First admin (bootstrap) | ⏳ Not created yet |
| Deployment | ⏳ Not deployed |
| Kits & stocktake pages | 🚧 UI only (mock data) |
| Email notifications, offline sync, SSO, multi-level approval, disposal approval workflow | 🚧 Planned |
| Automated tests / CI | 🚧 Not set up |

---

## Notes

- QR codes encode `/{locale}/e/{asset_code}`. Labels print with `window.print()` and CSS named pages so Thai text renders correctly.
- Login is rate limited in the app (`login_attempts`: 10 attempts / 5 minutes per identifier).
- Session cookie `session` is `httpOnly`, `sameSite=lax`, `secure` in production, 7-day expiry.
- Security headers (nosniff, frame-options, referrer-policy, permissions-policy, CSP report-only) are set in `next.config.mjs`.
- Price visibility is enforced in the UI/server actions only; database-level column protection is a Phase 2 item.
