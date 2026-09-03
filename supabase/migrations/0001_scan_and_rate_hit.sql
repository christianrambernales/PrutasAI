-- Scans uploaded from devices. Metadata only: the photograph never leaves the
-- phone.
create table if not exists scan (
  id               uuid primary key default gen_random_uuid(),
  device_id        text not null,
  user_id          uuid references auth.users(id) on delete set null,
  -- The column exists but is deliberately never populated: the drain
  -- (app/src/core/sync/drain.ts) must never send image_uri. A device file
  -- path can embed the OS username (e.g. C:\Users\<name>\...), so storing it
  -- server-side would leak PII the app's consent copy does not disclose.
  image_uri        text,
  fruit_key        text,
  fruit_conf       real check (fruit_conf between 0 and 1),
  variety_key      text,
  variety_conf     real check (variety_conf between 0 and 1),
  bbox_json        jsonb,
  manifest_version int,
  created_at       timestamptz not null,
  synced_at        timestamptz not null default now()
);
create index if not exists scan_device_idx on scan (device_id, created_at desc);
create index if not exists scan_user_idx   on scan (user_id, created_at desc);

-- One row per accepted request. Pruned per key on every check, so this stays
-- small without a scheduled job.
create table if not exists rate_hit (
  key text        not null,
  at  timestamptz not null default now()
);
create index if not exists rate_hit_key_at on rate_hit (key, at);

alter table scan enable row level security;

-- A signed-in user reads only their own rows. This is the restore path in
-- Task 10; no function is involved because a read needs no throttle.
create policy scan_select_own on scan for select
  using (auth.uid() is not null and user_id = auth.uid());

-- Inserts arrive only through the Vercel function, which has already
-- validated and throttled them.
create policy scan_insert_service on scan for insert
  to service_role with check (true);

-- rate_hit gets RLS with NO policy at all, so only the service role reaches
-- it. A counter the client can read or write is not a limiter.
alter table rate_hit enable row level security;
