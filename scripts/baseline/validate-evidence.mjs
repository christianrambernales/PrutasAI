export class EvidenceValidationError extends Error {}

const VALID_STATUSES = new Set(['Passed', 'Failed', 'Blocked', 'Not tested']);
const VALID_SCOPES = new Set(['local-static', 'local-test', 'web-runtime', 'android-device', 'authenticated-qa', 'deployed-qa']);

const SECRET_PATTERNS = [
  /token=[^\s]+/i,
  /password=[^\s]+/i,
  /secret=[^\s]+/i,
  /api_key=[^\s]+/i,
  /[a-zA-Z0-9]{32,}/ // generic high-entropy looking string (simple heuristic)
];

export function redactSecretValues(str) {
  if (typeof str !== 'string') return str;
  let redacted = str;
  redacted = redacted.replace(/(token=)[^\s]+/gi, '$1[REDACTED]');
  redacted = redacted.replace(/(password=)[^\s]+/gi, '$1[REDACTED]');
  redacted = redacted.replace(/(secret=)[^\s]+/gi, '$1[REDACTED]');
  redacted = redacted.replace(/(api_key=)[^\s]+/gi, '$1[REDACTED]');
  // More generic heuristic replacement can be tricky without breaking things, 
  // but let's stick to key=value for basic redaction.
  return redacted;
}

export function validateEvidenceRecords(records) {
  const errors = [];
  
  for (const record of records) {
    if (!VALID_STATUSES.has(record.status)) {
      errors.push(`Record ${record.id}: invalid status '${record.status}'`);
    }
    
    if (record.status === 'Passed') {
      if (!record.scope || !VALID_SCOPES.has(record.scope)) {
        errors.push(`Record ${record.id}: Passed records must have a valid scope, got '${record.scope}'`);
      }
      if (record.commit === undefined || record.dirty === undefined) {
        errors.push(`Record ${record.id}: Passed records must have { commit, dirty }`);
      }
      if (!record.observedAt) {
        errors.push(`Record ${record.id}: Passed records must have observedAt`);
      }
      if (!record.artifact && !record.command) {
        errors.push(`Record ${record.id}: Passed records must have artifact or command`);
      }
    }
    
    // Check for secrets
    const serialized = JSON.stringify(record);
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(serialized)) {
        // Double check if it's already redacted
        if (!/\[REDACTED\]/.test(serialized)) {
           errors.push(`Record ${record.id}: contains potential unredacted secret`);
           break;
        }
      }
    }
  }
  
  if (errors.length > 0) {
    throw new EvidenceValidationError('Evidence validation failed:\n' + errors.join('\n'));
  }
}
