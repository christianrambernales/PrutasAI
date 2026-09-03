-- 0005_conversation_policy_hardening.sql
-- Security fix for three write policies from 0004_conversations.sql that
-- checked `user_id is not null` instead of binding to the caller's identity.
--
-- The worst of the three was conversation_update_service: an UPDATE policy's
-- WITH CHECK constrains only the new row values, it is never used as a
-- fallback USING clause. With no USING at all, the policy matched every row
-- in the table as an update *target*. Combined with both anon and
-- authenticated holding the UPDATE grant on public.conversation, any client
-- could retitle or soft-delete another user's conversation, e.g.
-- PATCH /rest/v1/conversation?id=eq.<victim-id>. conversation_insert_service
-- and conversation_message_insert_service had the same unbound shape on
-- INSERT, letting a client plant rows under another user's user_id --
-- including assistant-role messages.
--
-- These policies are a backstop, not the intended write path: writes are
-- meant to go through the two authenticated Vercel endpoints running as
-- service_role, which bypasses RLS entirely. Binding these policies to
-- auth.uid() cannot break that path. Fixed shape matches profile_update_own
-- in 0003_profile_and_owned_scans.sql.
--
-- conversation_select_own, conversation_message_select_own, and
-- conversation_delete_own already use auth.uid() = user_id and are
-- unchanged here. public.scan carries the same inherited weakness but is
-- out of scope for this migration.

drop policy if exists conversation_update_service on public.conversation;
create policy conversation_update_service on public.conversation
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists conversation_insert_service on public.conversation;
create policy conversation_insert_service on public.conversation
  for insert with check (auth.uid() = user_id);

drop policy if exists conversation_message_insert_service on public.conversation_message;
create policy conversation_message_insert_service on public.conversation_message
  for insert with check (auth.uid() = user_id);
