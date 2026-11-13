import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EvidenceValidationError, validateEvidenceRecords, redactSecretValues } from './validate-evidence.mjs';

test('validate-evidence - redactSecretValues', (t) => {
  const input = 'This is a test with token=12345secret and password=mypassword.';
  const redacted = redactSecretValues(input);
  assert.match(redacted, /token=\[REDACTED\]/);
  assert.match(redacted, /password=\[REDACTED\]/);
  assert.doesNotMatch(redacted, /12345secret/);
  assert.doesNotMatch(redacted, /mypassword/);
});

test('validate-evidence - validateEvidenceRecords', (t) => {
  const validRecord = {
    id: 'T-01',
    status: 'Passed',
    scope: 'local-test',
    commit: 'abcdef',
    dirty: false,
    observedAt: '2026-09-15T00:00:00Z',
    command: 'npm run test',
    notes: 'All good'
  };

  assert.doesNotThrow(() => validateEvidenceRecords([validRecord]));

  const invalidRecord = {
    id: 'T-02',
    status: 'Passed',
    // missing scope, commit, dirty, observedAt, artifact/command
  };

  assert.throws(() => validateEvidenceRecords([invalidRecord]), EvidenceValidationError);

  const invalidScope = {
    ...validRecord,
    id: 'T-03',
    scope: 'invalid-scope'
  };
  assert.throws(() => validateEvidenceRecords([invalidScope]), EvidenceValidationError);

  const secretRecord = {
    ...validRecord,
    id: 'T-04',
    notes: 'My secret token=1234567890abcdef'
  };
  
  // validateEvidenceRecords should throw if unredacted secrets are found
  assert.throws(() => validateEvidenceRecords([secretRecord]), EvidenceValidationError);
});
