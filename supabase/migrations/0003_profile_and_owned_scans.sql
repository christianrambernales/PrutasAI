-- 0003_profile_and_owned_scans.sql
-- Scans are always attributed to a user. Anonymous rows and the claim path are gone.

create table if not exists public.profile (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profile enable row level security;

drop policy if exists profile_select_own on public.profile;
create policy profile_select_own on public.profile
  for select using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists profile_update_own on public.profile;
create policy profile_update_own on public.profile
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No insert policy: only the trigger below writes this table, so an account
-- can never exist without a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profile (user_id, email, display_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

delete from public.scan where user_id is null;
alter table public.scan alter column user_id set not null;

drop policy if exists scan_insert_service on public.scan;
create policy scan_insert_service on public.scan
  for insert with check (user_id is not null);
