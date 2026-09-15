import { readFileSync, existsSync } from 'node:fs';

export class TraceabilityValidationError extends Error {}

const EXPECTED_IDS = new Set([
  'B-01', 'B-02', 'B-03', 'B-04',
  'UX-01', 'UX-02', 'UX-03', 'UX-04', 'UX-05', 'UX-06', 'UX-07', 'UX-08', 'UX-09', 'UX-10',
  'FE-01', 'FE-02', 'FE-03', 'FE-04', 'FE-05', 'FE-06',
  'A11Y-01', 'A11Y-02', 'A11Y-03', 'A11Y-04'
]);

export function validateFindingLedger(ledger, roadmapPath) {
  if (!existsSync(roadmapPath)) {
    throw new TraceabilityValidationError(`ROADMAP.md not found at ${roadmapPath}`);
  }

  const roadmapContent = readFileSync(roadmapPath, 'utf8');
  const validPhases = new Set();
  
  // Parse phase numbers from ROADMAP.md
  // looking for "### Phase N:"
  const phaseRegex = /### Phase (\d+):/g;
  let match;
  while ((match = phaseRegex.exec(roadmapContent)) !== null) {
    validPhases.add(parseInt(match[1], 10));
  }

  const seenIds = new Set();
  const errors = [];

  for (const row of ledger) {
    if (!EXPECTED_IDS.has(row.id)) {
      errors.push(`Unknown or invalid finding ID: ${row.id}`);
    }
    
    if (seenIds.has(row.id)) {
      errors.push(`Duplicate finding ID: ${row.id}`);
    }
    seenIds.add(row.id);

    if (row.targetPhase < 2 || row.targetPhase > 7) {
      errors.push(`Finding ${row.id}: targetPhase must be between 2 and 7, got ${row.targetPhase}`);
    } else if (!validPhases.has(row.targetPhase)) {
      errors.push(`Finding ${row.id}: targetPhase ${row.targetPhase} not found in ROADMAP.md`);
    }

    if (!row.activeModule) {
      errors.push(`Finding ${row.id}: missing activeModule`);
    }
    
    if (!row.acceptanceEvidence) {
      errors.push(`Finding ${row.id}: missing acceptanceEvidence`);
    }
  }

  for (const expected of EXPECTED_IDS) {
    if (!seenIds.has(expected)) {
      errors.push(`Missing expected finding ID: ${expected}`);
    }
  }

  if (errors.length > 0) {
    throw new TraceabilityValidationError('Traceability validation failed:\n' + errors.join('\n'));
  }
}
