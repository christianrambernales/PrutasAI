-- 0006_scan_policy_hardening.sql
-- Finishes the job 0005_conversation_policy_hardening.sql started, on the one
-- table it explicitly left out.
--
-- 0001_scan_and_rate_hit.sql restricted INSERT to `to service_role`, so the
-- policy was unreachable from a client. 0003_profile_and_owned_scans.sql
-- replaced it with `with check (user_id is not null)` and dropped the role
-- restriction, which applies the policy to every role instead. Supabase grants
-- anon and authenticated INSERT on public tables by default, so anyone holding
-- the public anon key could POST /rest/v1/scan with an arbitrary user_id and
-- attribute a scan to another account.
--
-- Same fix and same shape as conversation_insert_service in 0005: bind the
-- policy to the caller's identity. This cannot break the intended write path —
-- scans are written by the Vercel function running as service_role, which
-- bypasses RLS entirely.

drop policy if exists scan_insert_service on public.scan;
create policy scan_insert_service on public.scan
  for insert with check (auth.uid() = user_id);
