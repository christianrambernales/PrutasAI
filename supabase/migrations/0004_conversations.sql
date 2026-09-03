-- 0004_conversations.sql
-- Chat conversations and their messages, synced per account. Soft-deleted via
-- deleted_at (a Trash), permanently removed only by an explicit hard delete.

create table public.conversation (
  id         uuid primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table public.conversation_message (
  id              uuid primary key,
  conversation_id uuid not null references public.conversation(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  kind            text,
  text            text not null,
  verdict_json    jsonb,
  created_at      timestamptz not null
);

alter table public.conversation enable row level security;
alter table public.conversation_message enable row level security;

create policy conversation_select_own on public.conversation
  for select using (auth.uid() = user_id);
create policy conversation_delete_own on public.conversation
  for delete using (auth.uid() = user_id);
create policy conversation_insert_service on public.conversation
  for insert with check (user_id is not null);
create policy conversation_update_service on public.conversation
  for update with check (user_id is not null);

create policy conversation_message_select_own on public.conversation_message
  for select using (auth.uid() = user_id);
create policy conversation_message_insert_service on public.conversation_message
  for insert with check (user_id is not null);
