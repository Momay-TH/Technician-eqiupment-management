# Legacy Supabase SQL (archived)

These files are the pre-migration Postgres schema for the app, kept only as reference for the
business rules that were moved into Cloudflare D1 + TypeScript.

They are **not executed** anywhere and nothing in `src/` references them.

The live schema is in `migrations/d1/`:

- `0001_init.sql` — tables, indexes, checks
- `0002_seed.sql` — permissions, catalog seed, status transitions, locations

Notes on the port:

- Postgres enums → `TEXT` + `CHECK` constraints.
- `auth.users` trigger provisioning → `POST /api/auth/bootstrap` (first admin) + Settings → Users.
- `has_permission()` + RLS → `src/lib/permissions.ts` and per-action `requirePermission()` checks.
- Supabase Storage policies → R2 binding `STORAGE` served by `/api/files/[...key]`.
- `updated_at` triggers → explicit timestamps in each server action.
