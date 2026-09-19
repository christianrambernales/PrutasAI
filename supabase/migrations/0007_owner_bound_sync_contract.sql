-- 0007_owner_bound_sync_contract.sql
-- Additive, idempotent migration establishing owner-bound sync contracts (D-05, D-10, D-13, D-14, D-15).
-- 1. Scan update/delete tracking columns and supporting owner/update indexes.
-- 2. Non-sensitive owner/device progress table (sync_state).
-- 3. Explicit authenticated grants and owner-bound RLS policies (with parent check for messages).
-- 4. Atomic owner-bound write primitives rejecting cross-owner mutations and race conditions.

-- ============================================================================
-- 1. Scan update and soft-deletion tracking
-- ============================================================================

alter table public.scan add column if not exists updated_at timestamptz default now();
update public.scan set updated_at = created_at where updated_at is null;
alter table public.scan alter column updated_at set not null;

alter table public.scan add column if not exists deleted_at timestamptz;

create index if not exists scan_user_updated_idx on public.scan (user_id, updated_at desc);
create index if not exists scan_user_deleted_idx on public.scan (user_id, deleted_at) where deleted_at is not null;

-- ============================================================================
-- 2. Non-sensitive owner/device sync state table
-- ============================================================================

create table if not exists public.sync_state (
  user_id        uuid not null references auth.users(id) on delete cascade,
  device_id      text not null,
  last_synced_at timestamptz not null default now(),
  cursor         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, device_id)
);

create index if not exists sync_state_user_device_idx on public.sync_state (user_id, device_id);

-- ============================================================================
-- 3. Explicit Grants & Role Permissions
-- ============================================================================

-- Authenticated users have scoped CRUD access governed strictly by RLS.
grant select, insert, update, delete on public.scan to authenticated;
grant select, insert, update, delete on public.conversation to authenticated;
grant select, insert, update, delete on public.conversation_message to authenticated;
grant select, insert, update, delete on public.sync_state to authenticated;
grant select, update on public.profile to authenticated;

-- Public/anonymous clients must not write to any synced entity.
revoke insert, update, delete on public.scan from anon;
revoke insert, update, delete on public.conversation from anon;
revoke insert, update, delete on public.conversation_message from anon;
revoke insert, update, delete on public.sync_state from anon;
revoke insert, update, delete on public.profile from anon;

-- ============================================================================
-- 4. Row Level Security Policies
-- ============================================================================

alter table public.scan enable row level security;
alter table public.conversation enable row level security;
alter table public.conversation_message enable row level security;
alter table public.sync_state enable row level security;
alter table public.profile enable row level security;

-- sync_state policies
drop policy if exists sync_state_select_own on public.sync_state;
create policy sync_state_select_own on public.sync_state
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists sync_state_insert_own on public.sync_state;
create policy sync_state_insert_own on public.sync_state
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists sync_state_update_own on public.sync_state;
create policy sync_state_update_own on public.sync_state
  for update using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists sync_state_delete_own on public.sync_state;
create policy sync_state_delete_own on public.sync_state
  for delete using (auth.uid() is not null and user_id = auth.uid());

-- scan policies
drop policy if exists scan_select_own on public.scan;
create policy scan_select_own on public.scan
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists scan_insert_service on public.scan;
drop policy if exists scan_insert_own on public.scan;
create policy scan_insert_own on public.scan
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists scan_update_own on public.scan;
create policy scan_update_own on public.scan
  for update using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists scan_delete_own on public.scan;
create policy scan_delete_own on public.scan
  for delete using (auth.uid() is not null and user_id = auth.uid());

-- conversation policies
drop policy if exists conversation_select_own on public.conversation;
create policy conversation_select_own on public.conversation
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists conversation_insert_service on public.conversation;
drop policy if exists conversation_insert_own on public.conversation;
create policy conversation_insert_own on public.conversation
  for insert with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists conversation_update_service on public.conversation;
drop policy if exists conversation_update_own on public.conversation;
create policy conversation_update_own on public.conversation
  for update using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists conversation_delete_own on public.conversation;
create policy conversation_delete_own on public.conversation
  for delete using (auth.uid() is not null and user_id = auth.uid());

-- conversation_message policies (must also prove parent conversation ownership)
drop policy if exists conversation_message_select_own on public.conversation_message;
create policy conversation_message_select_own on public.conversation_message
  for select using (
    auth.uid() is not null
    and user_id = auth.uid()
    and exists (
      select 1 from public.conversation c
      where c.id = conversation_message.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists conversation_message_insert_service on public.conversation_message;
drop policy if exists conversation_message_insert_own on public.conversation_message;
create policy conversation_message_insert_own on public.conversation_message
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and exists (
      select 1 from public.conversation c
      where c.id = conversation_message.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists conversation_message_update_own on public.conversation_message;
create policy conversation_message_update_own on public.conversation_message
  for update using (
    auth.uid() is not null
    and user_id = auth.uid()
    and exists (
      select 1 from public.conversation c
      where c.id = conversation_message.conversation_id
        and c.user_id = auth.uid()
    )
  ) with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and exists (
      select 1 from public.conversation c
      where c.id = conversation_message.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists conversation_message_delete_own on public.conversation_message;
create policy conversation_message_delete_own on public.conversation_message
  for delete using (
    auth.uid() is not null
    and user_id = auth.uid()
    and exists (
      select 1 from public.conversation c
      where c.id = conversation_message.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. Atomic Owner-Bound Write Primitives
-- ============================================================================

-- Atomic scan upsert: inserts new scan or updates existing scan only if caller is stored owner.
create or replace function public.upsert_scan_atomic(
  p_id uuid,
  p_user_id uuid,
  p_device_id text,
  p_image_uri text default null,
  p_fruit_key text default null,
  p_fruit_conf real default null,
  p_variety_key text default null,
  p_variety_conf real default null,
  p_bbox_json jsonb default null,
  p_manifest_version int default null,
  p_created_at timestamptz default now(),
  p_updated_at timestamptz default now(),
  p_deleted_at timestamptz default null,
  p_lat real default null,
  p_lon real default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing_owner uuid;
begin
  select user_id into v_existing_owner
  from public.scan
  where id = p_id
  for update;

  if found and v_existing_owner <> p_user_id then
    raise exception 'ownership conflict: scan owned by another account' using errcode = '23505';
  end if;

  insert into public.scan (
    id, user_id, device_id, image_uri, fruit_key, fruit_conf,
    variety_key, variety_conf, bbox_json, manifest_version,
    created_at, updated_at, deleted_at, lat, lon
  ) values (
    p_id, p_user_id, p_device_id, p_image_uri, p_fruit_key, p_fruit_conf,
    p_variety_key, p_variety_conf, p_bbox_json, p_manifest_version,
    p_created_at, coalesce(p_updated_at, now()), p_deleted_at, p_lat, p_lon
  )
  on conflict (id) do update set
    device_id = excluded.device_id,
    fruit_key = excluded.fruit_key,
    fruit_conf = excluded.fruit_conf,
    variety_key = excluded.variety_key,
    variety_conf = excluded.variety_conf,
    bbox_json = excluded.bbox_json,
    manifest_version = excluded.manifest_version,
    updated_at = excluded.updated_at,
    deleted_at = excluded.deleted_at,
    lat = excluded.lat,
    lon = excluded.lon
  where scan.user_id = p_user_id;

  if not found then
    raise exception 'ownership conflict: scan owned by another account' using errcode = '23505';
  end if;

  return 'ok';
end;
$function$;

-- Atomic conversation upsert: inserts new conversation or updates existing only if caller is stored owner.
create or replace function public.upsert_conversation_atomic(
  p_id uuid,
  p_user_id uuid,
  p_title text,
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing_owner uuid;
begin
  select user_id into v_existing_owner
  from public.conversation
  where id = p_id
  for update;

  if found and v_existing_owner <> p_user_id then
    raise exception 'ownership conflict: conversation owned by another account' using errcode = '23505';
  end if;

  insert into public.conversation (
    id, user_id, title, created_at, updated_at, deleted_at
  ) values (
    p_id, p_user_id, p_title, p_created_at, p_updated_at, p_deleted_at
  )
  on conflict (id) do update set
    title = excluded.title,
    updated_at = excluded.updated_at,
    deleted_at = excluded.deleted_at
  where conversation.user_id = p_user_id;

  if not found then
    raise exception 'ownership conflict: conversation owned by another account' using errcode = '23505';
  end if;

  return 'ok';
end;
$function$;

-- Atomic message upsert: verifies parent conversation belongs to caller, and updates existing message only if owned by caller.
create or replace function public.upsert_conversation_message_atomic(
  p_id uuid,
  p_conversation_id uuid,
  p_user_id uuid,
  p_role text,
  p_kind text default null,
  p_text text default '',
  p_verdict_json jsonb default null,
  p_created_at timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_parent_owner uuid;
  v_existing_owner uuid;
begin
  select user_id into v_parent_owner
  from public.conversation
  where id = p_conversation_id;

  if not found or v_parent_owner <> p_user_id then
    raise exception 'parent ownership conflict' using errcode = '23505';
  end if;

  select user_id into v_existing_owner
  from public.conversation_message
  where id = p_id
  for update;

  if found and v_existing_owner <> p_user_id then
    raise exception 'ownership conflict: message owned by another account' using errcode = '23505';
  end if;

  insert into public.conversation_message (
    id, conversation_id, user_id, role, kind, text, verdict_json, created_at
  ) values (
    p_id, p_conversation_id, p_user_id, p_role, p_kind, p_text, p_verdict_json, p_created_at
  )
  on conflict (id) do update set
    role = excluded.role,
    kind = excluded.kind,
    text = excluded.text,
    verdict_json = excluded.verdict_json
  where conversation_message.user_id = p_user_id;

  if not found then
    raise exception 'ownership conflict: message owned by another account' using errcode = '23505';
  end if;

  return 'ok';
end;
$function$;

grant execute on function public.upsert_scan_atomic to authenticated, service_role;
grant execute on function public.upsert_conversation_atomic to authenticated, service_role;
grant execute on function public.upsert_conversation_message_atomic to authenticated, service_role;

-- ============================================================================
-- 6. Rollback / Down Instructions (Reversible Rehearsal Documentation)
-- ============================================================================
-- To rollback migration 0007 if needed:
-- drop function if exists public.upsert_conversation_message_atomic(uuid, uuid, uuid, text, text, text, jsonb, timestamptz);
-- drop function if exists public.upsert_conversation_atomic(uuid, uuid, text, timestamptz, timestamptz, timestamptz);
-- drop function if exists public.upsert_scan_atomic(uuid, uuid, text, text, text, real, text, real, jsonb, int, timestamptz, timestamptz, timestamptz, real, real);
-- drop table if exists public.sync_state cascade;
-- drop index if exists scan_user_deleted_idx;
-- drop index if exists scan_user_updated_idx;
-- alter table public.scan drop column if exists deleted_at;
-- alter table public.scan drop column if exists updated_at;
-- -- Restore previous 0005/0006 policies as needed.