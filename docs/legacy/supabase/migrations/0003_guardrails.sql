-- ============================================================
-- Technician Equipment Management — MVP v1
-- Migration 0003: guardrails (immutable fields, protected state)
-- Apply after 0001_init.sql, 0002_storage.sql and seed.sql
-- ============================================================

-- ------------------------------------------------------------
-- Equipment: asset_code is immutable; serial_number needs a
-- dedicated permission. Service-role/server paths (auth.uid()
-- is null) are trusted and bypass these checks.
-- ------------------------------------------------------------
create or replace function public.guard_equipment_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.asset_code is distinct from old.asset_code then
    raise exception 'asset_code is immutable';
  end if;

  if new.serial_number is distinct from old.serial_number
     and not public.has_permission(auth.uid(), 'equipment:serial_edit') then
    raise exception 'permission denied to edit serial number';
  end if;

  return new;
end;
$$;

drop trigger if exists equipment_guard_fields on public.equipment;
create trigger equipment_guard_fields
  before update on public.equipment
  for each row execute function public.guard_equipment_fields();

-- ------------------------------------------------------------
-- Checkout requests: direct clients may only cancel their own
-- pending request. Approval/rejection/completion must go
-- through an actor with checkout:approve (server actions use
-- the service role, which bypasses this trigger).
-- ------------------------------------------------------------
create or replace function public.guard_checkout_request_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at
     or new.rejection_reason is distinct from old.rejection_reason then
    if not public.has_permission(auth.uid(), 'checkout:approve') then
      if not (
        old.requested_by = auth.uid()
        and old.status = 'pending'
        and new.status = 'cancelled'
      ) then
        raise exception 'permission denied to change checkout status';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists checkout_request_guard_update on public.checkout_requests;
create trigger checkout_request_guard_update
  before update on public.checkout_requests
  for each row execute function public.guard_checkout_request_update();

-- ------------------------------------------------------------
-- Checkout items: status/handover/return fields are only
-- writable by approvers (or trusted server paths).
-- ------------------------------------------------------------
create or replace function public.guard_checkout_item_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.checked_out_at is distinct from old.checked_out_at
     or new.returned_at is distinct from old.returned_at
     or new.condition_on_return is distinct from old.condition_on_return then
    if not public.has_permission(auth.uid(), 'checkout:approve') then
      raise exception 'permission denied to change checkout item state';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists checkout_item_guard_update on public.checkout_request_items;
create trigger checkout_item_guard_update
  before update on public.checkout_request_items
  for each row execute function public.guard_checkout_item_update();

-- ------------------------------------------------------------
-- Login identifier resolution must only be reachable by the
-- service role (the app's rate-limited API route), not by
-- anonymous/authenticated PostgREST callers.
-- ------------------------------------------------------------
revoke execute on function public.resolve_login_email(text) from public;
revoke execute on function public.resolve_login_email(text) from anon;
revoke execute on function public.resolve_login_email(text) from authenticated;
grant execute on function public.resolve_login_email(text) to service_role;
