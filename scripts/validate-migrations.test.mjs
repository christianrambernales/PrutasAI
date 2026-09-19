import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateMigrations } from './validate-migrations.mjs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(scriptsDir, '..', 'supabase', 'migrations');

const functionSignatures = {
  scan: 'public.upsert_scan_atomic(uuid, uuid, text, text, text, real, text, real, jsonb, int, timestamptz, timestamptz, timestamptz, real, real)',
  conversation: 'public.upsert_conversation_atomic(uuid, uuid, text, timestamptz, timestamptz, timestamptz)',
  message: 'public.upsert_conversation_message_atomic(uuid, uuid, uuid, text, text, text, jsonb, timestamptz)',
};

function securedExecuteGrants() {
  return Object.values(functionSignatures)
    .flatMap(signature => [
      `revoke execute on function ${signature} from public;`,
      `revoke execute on function ${signature} from anon;`,
      `revoke execute on function ${signature} from authenticated;`,
      `grant execute on function ${signature} to service_role;`,
    ])
    .join('\n');
}

function withTempMigrations(run) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'prutasai-migrations-'));
  const tempMigrations = join(tempRoot, 'migrations');
  cpSync(migrationsDir, tempMigrations, { recursive: true });

  try {
    return run(tempMigrations);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function mutate0007(tempMigrations, mutate) {
  const file = join(tempMigrations, '0007_owner_bound_sync_contract.sql');
  const original = readFileSync(file, 'utf8');
  const currentGrants = [
    'grant execute on function public.upsert_scan_atomic to authenticated, service_role;',
    'grant execute on function public.upsert_conversation_atomic to authenticated, service_role;',
    'grant execute on function public.upsert_conversation_message_atomic to authenticated, service_role;',
  ].join('\n');
  const baseline = original.includes(currentGrants)
    ? original.replace(currentGrants, securedExecuteGrants())
    : original;

  writeFileSync(file, mutate(baseline), 'utf8');
}

test('accepts an unmodified complete 0001-0007 migration directory', () => {
  withTempMigrations(tempMigrations => {
    assert.equal(validateMigrations(tempMigrations), true);
  });
});

test('rejects an owner-bound RPC without its PUBLIC execute revocation', () => {
  withTempMigrations(tempMigrations => {
    mutate0007(tempMigrations, sql => sql.replace(
      `revoke execute on function ${functionSignatures.scan} from public;\n`,
      '',
    ));

    assert.throws(() => validateMigrations(tempMigrations), /PUBLIC execute revocation/i);
  });
});

for (const [name, signature] of Object.entries(functionSignatures)) {
  for (const role of ['authenticated', 'anon']) {
    test(`rejects ${role} execute access for ${name} owner-bound RPC`, () => {
      withTempMigrations(tempMigrations => {
        mutate0007(tempMigrations, sql => `${sql}\ngrant execute on function ${signature} to ${role};\n`);

        assert.throws(() => validateMigrations(tempMigrations), new RegExp(`${role} execute grant`, 'i'));
      });
    });
  }

  test(`rejects ${name} owner-bound RPC without a service_role-only grant`, () => {
    withTempMigrations(tempMigrations => {
      mutate0007(tempMigrations, sql => sql.replace(
        `grant execute on function ${signature} to service_role;\n`,
        '',
      ));

      assert.throws(() => validateMigrations(tempMigrations), /service_role-only execute grant/i);
    });
  });
}
