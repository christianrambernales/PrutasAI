# Phase 03 two-account QA matrix

## Setup and cleanup

Use two independent normal test identities, **Account A** and **Account B**, plus **Anonymous**. Use generated UUIDs and non-sensitive fixture text. Record identity labels only. Execute each applicable case through direct **PostgREST** and the authenticated **service-role API** route; the service-role API path must be authenticated as the tested user and must not accept a forged owner. Cleanup deletes only fixtures created in the recorded run.

| Case | Precondition and sanitized request shape | Expected result | Scope/result | Cleanup |
| --- | --- | --- | --- | --- |
| Profile own read/update | A: `{display_name:"fixture"}` | A own row succeeds; B cannot read/update it | Authenticated QA / Not tested | Restore fixture value |
| Sync state own upsert | A: `{device_id:"fixture",last_successful_at:"ISO"}` | A own device state succeeds; B denied | Authenticated QA / Not tested | Delete fixture state |
| Scan own CRUD | A: `{uuid,created_at,updated_at,lat,lon}` | A create/read/update/delete succeeds | Authenticated QA / Not tested | Delete fixture scan |
| Scan cross-owner replay | B submits A UUID or forged owner | denial/no ownership transfer | Authenticated QA / Not tested | Verify A retained row |
| Conversation own CRUD | A: `{uuid,title,created_at,updated_at,deleted_at}` | A own operations succeed | Authenticated QA / Not tested | Delete fixture conversation |
| Message parent match | A message `{uuid,conversation_id,role,text}` | accepted only under A parent | Authenticated QA / Not tested | Delete fixture parent |
| Parent mismatch | B message references A conversation | denial/no child created | Authenticated QA / Not tested | Verify no row |
| Restore/deletion marker | A writes newer deletion marker then restores on A second client | newest valid deletion is retained; no photo payload | Authenticated QA / Not tested | Delete fixtures |
| Anonymous | no Authorization header | protected profile, sync, scan, conversation and message writes/reads denied | Authenticated QA / Not tested | None |

For every row run the same fixture through PostgREST and service-role API paths, record status/database effect without secrets, and mark a row Passed only after both applicable paths meet the expected outcome.
