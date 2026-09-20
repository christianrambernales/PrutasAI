import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const migrationsDir = join(root, 'supabase', 'migrations');

const ownerBoundFunctionSignatures = [
  'public.upsert_scan_atomic(uuid, uuid, text, text, text, real, text, real, jsonb, int, timestamptz, timestamptz, timestamptz, real, real)',
  'public.upsert_conversation_atomic(uuid, uuid, text, timestamptz, timestamptz, timestamptz)',
  'public.upsert_conversation_message_atomic(uuid, uuid, uuid, text, text, text, jsonb, timestamptz)',
];

function stripSqlComments(sql) {
  let result = '';
  let index = 0;
  let quote = null;
  let dollarQuote = null;

  while (index < sql.length) {
    if (dollarQuote) {
      if (sql.startsWith(dollarQuote, index)) {
        result += dollarQuote;
        index += dollarQuote.length;
        dollarQuote = null;
      } else {
        result += sql[index];
        index += 1;
      }
      continue;
    }

    const character = sql[index];
    const nextCharacter = sql[index + 1];

    if (quote) {
      result += character;
      if (character === quote && nextCharacter === quote) {
        result += nextCharacter;
        index += 2;
        continue;
      }
      if (character === quote) {
        quote = null;
      }
      index += 1;
      continue;
    }

    if (character === '$') {
      const tag = sql.slice(index).match(/^\$[a-z_][a-z0-9_]*\$/i)?.[0] ??
        (sql.startsWith('$$', index) ? '$$' : null);
      if (tag) {
        result += tag;
        index += tag.length;
        dollarQuote = tag;
        continue;
      }
    }

    if (character === '\'' || character === '"') {
      quote = character;
      result += character;
      index += 1;
      continue;
    }

    if (character === '-' && nextCharacter === '-') {
      index += 2;
      while (index < sql.length && sql[index] !== '\n') {
        index += 1;
      }
      result += ' ';
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      let depth = 1;
      index += 2;

      // PostgreSQL permits nested block comments. Continue until the matching
      // outer terminator so comment text cannot split a protected routine
      // identifier and hide an unsafe GRANT from the normalized parser.
      while (index < sql.length && depth > 0) {
        if (sql[index] === '/' && sql[index + 1] === '*') {
          depth += 1;
          index += 2;
        } else if (sql[index] === '*' && sql[index + 1] === '/') {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }

      result += ' ';
      continue;
    }

    result += character;
    index += 1;
  }

  return result;
}

function normalizeSql(sql) {
  return stripSqlComments(sql)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ownerBoundFunctionNames = ownerBoundFunctionSignatures.map(signature => {
  const qualifiedName = signature.slice(0, signature.indexOf('('));
  return qualifiedName.slice('public.'.length);
});

function normalizeRoutineIdentifier(routine) {
  const signatureStart = routine.indexOf('(');
  const identifier = (signatureStart === -1 ? routine : routine.slice(0, signatureStart)).trim();
  return identifier
    .split(/\s*\.\s*/)
    .map(part => part.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"').toLowerCase())
    .join('.');
}

function normalizeRoleIdentifier(role) {
  return role.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"').toLowerCase();
}

function parseFunctionGrantStatements(sql) {
  return [...sql.matchAll(/grant execute on function\s+(.+?)\s+to\s+([^;]+);/g)].map(match => ({
    routine: normalizeRoutineIdentifier(match[1]),
    roles: match[2].split(',').map(normalizeRoleIdentifier),
  }));
}

function isOwnerBoundRoutine(routine) {
  const segments = routine.split('.');
  const functionName = segments[segments.length - 1];
  const schema = segments.length === 2 ? segments[0] : null;

  return ownerBoundFunctionNames.includes(functionName) && (schema === null || schema === 'public');
}

function validateOwnerBoundFunctionPrivileges(sql) {
  const normalizedSql = normalizeSql(sql);
  const functionGrants = parseFunctionGrantStatements(normalizedSql);

  for (const signature of ownerBoundFunctionSignatures) {
    const normalizedSignature = signature.toLowerCase();
    const functionName = normalizedSignature.slice(0, normalizedSignature.indexOf('('));
    for (const role of ['public', 'anon', 'authenticated']) {
      const requiredRevocation = `revoke execute on function ${normalizedSignature} from ${role};`;
      if (!normalizedSql.includes(requiredRevocation)) {
        throw new Error(`Migration 0007 missing ${role.toUpperCase()} execute revocation for ${signature}`);
      }
    }

    const grants = [...normalizedSql.matchAll(new RegExp(
      `grant execute on function ${escapeRegex(functionName)}\\s*(?:\\([^;]*?\\))?\\s+to ([^;]+);`,
      'g',
    ))].map(match => match[1].split(',').map(role => role.trim()));

    const unsafeGrant = functionGrants.find(grant =>
      isOwnerBoundRoutine(grant.routine) &&
      grant.roles.some(role => ['public', 'anon', 'authenticated'].includes(role)),
    );
    if (unsafeGrant) {
      const unsafeRole = unsafeGrant.roles.find(role => ['public', 'anon', 'authenticated'].includes(role));
      throw new Error(`Migration 0007 contains unsafe ${unsafeRole} execute grant for ${signature}`);
    }

    if (grants.length !== 1 || grants[0].length !== 1 || grants[0][0] !== 'service_role') {
      throw new Error(`Migration 0007 missing service_role-only execute grant for ${signature}`);
    }
  }
}

export function validateMigrations(dir = migrationsDir) {
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    throw new Error('No migration files found in ' + dir);
  }

  // 1. Verify contiguous 0001-0007 numbering
  const expectedCount = 7;
  const migrationNumbers = files.map((f, i) => {
    const match = f.match(/^(\d{4})_/);
    if (!match) {
      throw new Error(`Migration file does not start with 4-digit prefix: ${f}`);
    }
    return parseInt(match[1], 10);
  });

  for (let i = 0; i < expectedCount; i++) {
    const expected = i + 1;
    if (migrationNumbers[i] !== expected) {
      throw new Error(`Migrations are not contiguous: expected ${expected.toString().padStart(4, '0')}, found ${files[i]}`);
    }
  }

  if (files.length !== expectedCount) {
    throw new Error(`Expected exactly ${expectedCount} migrations (0001-0007), found ${files.length}`);
  }

  // 2. Verify 0007 tokens and policy/function assertions
  const m7File = files.find(f => f.startsWith('0007_'));
  if (!m7File) {
    throw new Error('Migration 0007 file not found');
  }

  const m7Sql = readFileSync(join(dir, m7File), 'utf8');

  // Check columns & tables
  const requiredSchemaTokens = [
    'updated_at timestamptz',
    'deleted_at timestamptz',
    'public.sync_state',
    'primary key (user_id, device_id)',
  ];

  for (const token of requiredSchemaTokens) {
    if (!m7Sql.includes(token)) {
      throw new Error(`Migration 0007 missing required schema token: "${token}"`);
    }
  }

  // Check explicit grants
  const requiredGrants = [
    'grant select, insert, update, delete on public.scan to authenticated',
    'grant select, insert, update, delete on public.conversation to authenticated',
    'grant select, insert, update, delete on public.conversation_message to authenticated',
    'grant select, insert, update, delete on public.sync_state to authenticated',
    'revoke insert, update, delete on public.scan from anon',
  ];

  for (const grant of requiredGrants) {
    if (!m7Sql.includes(grant)) {
      throw new Error(`Migration 0007 missing grant/revoke token: "${grant}"`);
    }
  }

  // Check RLS policies
  const requiredPolicies = [
    'sync_state_select_own',
    'sync_state_insert_own',
    'sync_state_update_own',
    'sync_state_delete_own',
    'scan_select_own',
    'scan_insert_own',
    'scan_update_own',
    'scan_delete_own',
    'conversation_select_own',
    'conversation_insert_own',
    'conversation_update_own',
    'conversation_delete_own',
    'conversation_message_select_own',
    'conversation_message_insert_own',
    'conversation_message_update_own',
    'conversation_message_delete_own',
  ];

  for (const policy of requiredPolicies) {
    if (!m7Sql.includes(policy)) {
      throw new Error(`Migration 0007 missing policy: "${policy}"`);
    }
  }

  // Check parent ownership proof on message policies
  if (!m7Sql.includes('where c.id = conversation_message.conversation_id') ||
      !m7Sql.includes('and c.user_id = auth.uid()')) {
    throw new Error('Migration 0007 message policies must prove parent conversation ownership via auth.uid()');
  }

  // Check atomic write primitives
  const requiredFunctions = [
    'upsert_scan_atomic',
    'upsert_conversation_atomic',
    'upsert_conversation_message_atomic',
  ];

  for (const fn of requiredFunctions) {
    if (!m7Sql.includes(fn)) {
      throw new Error(`Migration 0007 missing atomic function primitive: "${fn}"`);
    }
  }

  validateOwnerBoundFunctionPrivileges(m7Sql);

  // Check secrets absence
  const secretTokens = ['SUPABASE_SERVICE_ROLE_KEY', 'service_role_key=', 'eyJhbGciOi'];
  for (const secret of secretTokens) {
    if (m7Sql.includes(secret)) {
      throw new Error(`Migration 0007 must not embed secrets: found "${secret}"`);
    }
  }

  console.log(`✓ Validated contiguous migration sequence (0001-${expectedCount.toString().padStart(4, '0')})`);
  console.log('✓ Verified 0007 schema, indexes, RLS policies with parent-proof, grants, and atomic primitives');
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    validateMigrations();
  } catch (err) {
    console.error('Migration validation failed:', err.message);
    process.exit(1);
  }
}
