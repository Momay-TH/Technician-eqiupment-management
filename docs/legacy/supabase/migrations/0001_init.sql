-- ============================================================
-- Technician Equipment Management — MVP v1
-- Migration 0001: schema, permission engine, RLS, helpers
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------- enums ----------
do $$ begin
  create type user_role as enum ('admin','manager','technician','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type equipment_status as enum ('in_stock','in_vehicle','at_site','under_repair','damaged_pending_dispose','disposed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type history_action as enum ('created','status_change','assign','transfer','checkout','return','install','repair','dispose','serial_edit','updated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkout_status as enum ('pending','approved','rejected','cancelled','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkout_item_status as enum ('pending','checked_out','returned','damaged','lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type location_type as enum ('warehouse','branch','vehicle');
exception when duplicate_object then null; end $$;

do $$ begin
  create type permission_effect as enum ('inherit','grant','deny');
exception when duplicate_object then null; end $$;

-- ---------- permissions ----------
create table if not exists permissions (
  key text primary key,
  label_th text not null,
  label_en text not null,
  "group" text not null
);

-- ---------- users ----------
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique not null,
  username citext unique not null,
  name text not null,
  role user_role not null default 'viewer',
  phone text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (lower(username::text) ~ '^[a-z0-9._-]{3,32}$')
);

-- ---------- permission overrides ----------
create table if not exists user_permission_overrides (
  user_id uuid not null references users(id) on delete cascade,
  permission text not null references permissions(key) on delete cascade,
  effect permission_effect not null default 'inherit',
  updated_by uuid references users(id),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission)
);

-- ---------- audit ----------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ---------- catalog ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null unique,
  description text,
  icon text,
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists device_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  code text unique not null,
  name text not null,
  is_archived boolean not null default false,
  unique (category_id, name)
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_archived boolean not null default false
);

create table if not exists models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id),
  device_type_id uuid not null references device_types(id),
  name text not null,
  reference_price numeric(12,2),
  specs jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (brand_id, device_type_id, name)
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type location_type not null,
  code text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customer_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  contact_name text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- equipment ----------
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  asset_code text unique not null,
  serial_number text not null unique,
  name text not null,
  model_id uuid not null references models(id),
  status equipment_status not null default 'in_stock',
  location_id uuid references locations(id),
  customer_site_id uuid references customer_sites(id),
  assigned_to uuid references users(id),
  purchase_date date,
  purchase_price numeric(12,2),
  vendor text,
  warranty_months int,
  installed_at date,
  installed_by uuid references users(id),
  image_urls text[] not null default '{}',
  receipt_url text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists equipment_status_transitions (
  from_status equipment_status not null,
  to_status equipment_status not null,
  allowed_roles user_role[] not null default '{admin,manager}',
  primary key (from_status, to_status)
);

create table if not exists equipment_history (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  action history_action not null,
  from_status equipment_status,
  to_status equipment_status,
  from_location_id uuid references locations(id),
  to_location_id uuid references locations(id),
  from_site_id uuid references customer_sites(id),
  to_site_id uuid references customer_sites(id),
  from_user uuid references users(id),
  to_user uuid references users(id),
  notes text,
  reason text,
  performed_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ---------- checkout ----------
create table if not exists checkout_requests (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  requested_by uuid not null references users(id),
  status checkout_status not null default 'pending',
  purpose text,
  expected_return_date date,
  approved_by uuid references users(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists checkout_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references checkout_requests(id) on delete cascade,
  equipment_id uuid not null references equipment(id),
  status checkout_item_status not null default 'pending',
  checked_out_at timestamptz,
  returned_at timestamptz,
  condition_on_return text,
  return_notes text,
  unique (request_id, equipment_id)
);

-- 1 อุปกรณ์มี active checkout (checked_out) ได้ครั้งเดียว
create unique index if not exists one_active_checkout_per_equipment
  on checkout_request_items (equipment_id)
  where status = 'checked_out';

-- ---------- notifications ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text,
  type text not null,
  entity_type text,
  entity_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- login rate limit ----------
create table if not exists login_attempts (
  id bigserial primary key,
  identifier text not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_identifier_idx on login_attempts (identifier, created_at desc);

-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- role defaults + per-user override (deny > grant > role default)
create or replace function public.has_permission(p_uid uuid, p_key text)
returns boolean
language sql stable security definer set search_path = public
as $$
  with u as (
    select role, is_active from public.users where id = p_uid
  ),
  ov as (
    select effect from public.user_permission_overrides
    where user_id = p_uid and permission = p_key
  ),
  base as (
    select case
      when role = 'admin' then true
      when role = 'manager' then p_key = any (array[
        'equipment:read','equipment:create','equipment:update','equipment:archive',
        'price:read','qr:print','checkout:create','checkout:approve','checkout:return',
        'checkout:read_all','reports:read','audit:read'
      ])
      when role = 'technician' then p_key = any (array[
        'equipment:read','checkout:create','checkout:return','reports:read'
      ])
      when role = 'viewer' then p_key = any (array['equipment:read','reports:read'])
      else false
    end as allowed
    from u
  )
  select
    case
      when not exists (select 1 from u where is_active) then false
      when exists (select 1 from ov where effect = 'deny') then false
      when exists (select 1 from ov where effect = 'grant') then true
      else coalesce((select allowed from base), false)
    end;
$$;

create or replace function public.mark_login()
returns void
language sql security definer set search_path = public
as $$
  update public.users set last_login_at = now() where id = auth.uid();
$$;

-- resolve email/username for login (server-only usage; rate limited at app layer)
create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql stable security definer set search_path = public
as $$
  select email::text
  from public.users
  where is_active = true
    and (lower(email::text) = lower(p_identifier) or lower(username::text) = lower(p_identifier))
  limit 1;
$$;

-- generate readable asset code: {CAT}-{TYPE}-{0001}
create or replace function public.generate_asset_code(p_device_type_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_cat text;
  v_type text;
  v_prefix text;
  v_next int;
begin
  select c.code, dt.code into v_cat, v_type
  from public.device_types dt
  join public.categories c on c.id = dt.category_id
  where dt.id = p_device_type_id;

  if v_cat is null then
    raise exception 'device type not found';
  end if;

  v_prefix := v_cat || '-' || v_type || '-';
  perform pg_advisory_xact_lock(hashtext(v_prefix));

  select coalesce(max((regexp_replace(asset_code, '^.*-', ''))::int), 0) + 1
    into v_next
    from public.equipment
    where asset_code like v_prefix || '%';

  return v_prefix || lpad(v_next::text, 4, '0');
end;
$$;

-- change status with permission + transition check + history
create or replace function public.change_equipment_status(
  p_equipment_id uuid,
  p_to_status equipment_status,
  p_reason text default null,
  p_notes text default null,
  p_location_id uuid default null,
  p_customer_site_id uuid default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_eq public.equipment%rowtype;
  v_can boolean;
  v_transition_ok boolean;
begin
  select * into v_eq from public.equipment where id = p_equipment_id for update;
  if not found then raise exception 'equipment not found'; end if;

  v_can := public.has_permission(auth.uid(), 'equipment:update')
        or (
          v_eq.assigned_to = auth.uid()
          and public.has_permission(auth.uid(), 'checkout:return')
          and p_to_status in ('in_stock', 'under_repair')
        );
  if not v_can then raise exception 'permission denied'; end if;

  select exists (
    select 1 from public.equipment_status_transitions t
    where t.from_status = v_eq.status and t.to_status = p_to_status
  ) into v_transition_ok;
  if not v_transition_ok then
    raise exception 'transition % -> % not allowed', v_eq.status, p_to_status;
  end if;

  if p_to_status = 'disposed' and not (public.has_permission(auth.uid(),'equipment:archive')) then
    raise exception 'permission denied to dispose';
  end if;

  update public.equipment
    set status = p_to_status,
        location_id = coalesce(p_location_id, location_id),
        customer_site_id = coalesce(p_customer_site_id, customer_site_id),
        updated_at = now()
  where id = p_equipment_id;

  insert into public.equipment_history
    (equipment_id, action, from_status, to_status, from_location_id, to_location_id,
     from_site_id, to_site_id, notes, reason, performed_by)
  values
    (p_equipment_id, 'status_change', v_eq.status, p_to_status, v_eq.location_id, coalesce(p_location_id, v_eq.location_id),
     v_eq.customer_site_id, coalesce(p_customer_site_id, v_eq.customer_site_id), p_notes, p_reason, auth.uid());
end;
$$;

-- create user profile automatically after auth user created
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, username, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists equipment_updated_at on public.equipment;
create trigger equipment_updated_at before update on public.equipment for each row execute function public.set_updated_at();
drop trigger if exists checkout_requests_updated_at on public.checkout_requests;
create trigger checkout_requests_updated_at before update on public.checkout_requests for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.permissions enable row level security;
alter table public.users enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.audit_logs enable row level security;
alter table public.categories enable row level security;
alter table public.device_types enable row level security;
alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.locations enable row level security;
alter table public.customer_sites enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_status_transitions enable row level security;
alter table public.equipment_history enable row level security;
alter table public.checkout_requests enable row level security;
alter table public.checkout_request_items enable row level security;
alter table public.notifications enable row level security;
alter table public.login_attempts enable row level security;

-- permissions
drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions for select to authenticated using (true);

-- users
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated using (true);
drop policy if exists users_update on public.users;
create policy users_update on public.users for update to authenticated
  using (public.has_permission(auth.uid(),'users:manage'))
  with check (public.has_permission(auth.uid(),'users:manage'));

-- overrides
drop policy if exists overrides_select on public.user_permission_overrides;
create policy overrides_select on public.user_permission_overrides for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(),'permissions:manage'));
drop policy if exists overrides_write on public.user_permission_overrides;
create policy overrides_write on public.user_permission_overrides for all to authenticated
  using (public.has_permission(auth.uid(),'permissions:manage'))
  with check (public.has_permission(auth.uid(),'permissions:manage'));

-- audit logs
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select to authenticated
  using (public.has_permission(auth.uid(),'audit:read'));
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert to authenticated
  with check (actor_id = auth.uid());

-- catalog: read all authenticated; write settings:manage or equipment:update
do $$
declare t text;
begin
  foreach t in array array['categories','device_types','brands','models','locations','customer_sites'] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.has_permission(auth.uid(),''settings:manage'') or public.has_permission(auth.uid(),''equipment:update'')) with check (public.has_permission(auth.uid(),''settings:manage'') or public.has_permission(auth.uid(),''equipment:update''))', t, t);
  end loop;
end $$;

-- equipment
drop policy if exists equipment_select on public.equipment;
create policy equipment_select on public.equipment for select to authenticated
  using (public.has_permission(auth.uid(),'equipment:read'));
drop policy if exists equipment_insert on public.equipment;
create policy equipment_insert on public.equipment for insert to authenticated
  with check (public.has_permission(auth.uid(),'equipment:create'));
drop policy if exists equipment_update on public.equipment;
create policy equipment_update on public.equipment for update to authenticated
  using (public.has_permission(auth.uid(),'equipment:update'))
  with check (public.has_permission(auth.uid(),'equipment:update'));

-- status transitions
drop policy if exists transitions_select on public.equipment_status_transitions;
create policy transitions_select on public.equipment_status_transitions for select to authenticated using (true);
drop policy if exists transitions_write on public.equipment_status_transitions;
create policy transitions_write on public.equipment_status_transitions for all to authenticated
  using (public.has_permission(auth.uid(),'settings:manage'))
  with check (public.has_permission(auth.uid(),'settings:manage'));

-- history
drop policy if exists history_select on public.equipment_history;
create policy history_select on public.equipment_history for select to authenticated
  using (public.has_permission(auth.uid(),'equipment:read'));
drop policy if exists history_insert on public.equipment_history;
create policy history_insert on public.equipment_history for insert to authenticated
  with check (performed_by = auth.uid());

-- checkout requests
drop policy if exists checkout_select on public.checkout_requests;
create policy checkout_select on public.checkout_requests for select to authenticated
  using (
    requested_by = auth.uid()
    or public.has_permission(auth.uid(),'checkout:read_all')
    or public.has_permission(auth.uid(),'checkout:approve')
  );
drop policy if exists checkout_insert on public.checkout_requests;
create policy checkout_insert on public.checkout_requests for insert to authenticated
  with check (requested_by = auth.uid() and public.has_permission(auth.uid(),'checkout:create'));
drop policy if exists checkout_update on public.checkout_requests;
create policy checkout_update on public.checkout_requests for update to authenticated
  using (
    public.has_permission(auth.uid(),'checkout:approve')
    or (requested_by = auth.uid() and status in ('pending','cancelled'))
  )
  with check (
    public.has_permission(auth.uid(),'checkout:approve')
    or (requested_by = auth.uid() and status in ('pending','cancelled'))
  );

-- checkout items
drop policy if exists checkout_items_select on public.checkout_request_items;
create policy checkout_items_select on public.checkout_request_items for select to authenticated
  using (exists (select 1 from public.checkout_requests r where r.id = request_id));
drop policy if exists checkout_items_insert on public.checkout_request_items;
create policy checkout_items_insert on public.checkout_request_items for insert to authenticated
  with check (
    public.has_permission(auth.uid(),'checkout:create')
    and exists (select 1 from public.checkout_requests r where r.id = request_id and r.requested_by = auth.uid())
  );
drop policy if exists checkout_items_update on public.checkout_request_items;
create policy checkout_items_update on public.checkout_request_items for update to authenticated
  using (
    public.has_permission(auth.uid(),'checkout:approve')
    or exists (select 1 from public.checkout_requests r where r.id = request_id and r.requested_by = auth.uid())
  )
  with check (
    public.has_permission(auth.uid(),'checkout:approve')
    or exists (select 1 from public.checkout_requests r where r.id = request_id and r.requested_by = auth.uid())
  );

-- notifications (own only)
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
