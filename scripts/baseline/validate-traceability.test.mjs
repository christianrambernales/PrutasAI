import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TraceabilityValidationError, validateFindingLedger } from './validate-traceability.mjs';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

test('validate-traceability - validateFindingLedger', () => {
  const allIds = [
    'B-01', 'B-02', 'B-03', 'B-04',
    'UX-01', 'UX-02', 'UX-03', 'UX-04', 'UX-05', 'UX-06', 'UX-07', 'UX-08', 'UX-09', 'UX-10',
    'FE-01', 'FE-02', 'FE-03', 'FE-04', 'FE-05', 'FE-06',
    'A11Y-01', 'A11Y-02', 'A11Y-03', 'A11Y-04'
  ];

  const validLedger = allIds.map(id => ({
    id,
    targetPhase: 2, // 2 through 7 is valid
    activeModule: 'app/src/features/Capture',
    acceptanceEvidence: 'local-test passed'
  }));

  const dir = mkdtempSync(join(tmpdir(), 'gsd-validate-traceability-'));
  const roadmapPath = join(dir, 'ROADMAP.md');
  
  try {
    writeFileSync(roadmapPath, '### Phase 2: Offline Data and Persistence\n### Phase 3: Cloud, Auth, and Sync Security\n### Phase 4: Complete Product Flows\n### Phase 5: Assistant, Climate, and Safety\n### Phase 6: File-Based ML Readiness\n### Phase 7: QA, Accessibility, and Release Preparation');

    assert.doesNotThrow(() => validateFindingLedger(validLedger, roadmapPath));

    const invalidLedger1 = [...validLedger];
    invalidLedger1.pop(); // Missing A11Y-04
    assert.throws(() => validateFindingLedger(invalidLedger1, roadmapPath), TraceabilityValidationError);

    const invalidLedger2 = [...validLedger, validLedger[0]]; // Duplicate B-01
    assert.throws(() => validateFindingLedger(invalidLedger2, roadmapPath), TraceabilityValidationError);

    const invalidLedger3 = [...validLedger];
    invalidLedger3[0] = { ...invalidLedger3[0], targetPhase: 8 }; // Phase 8 doesn't exist
    assert.throws(() => validateFindingLedger(invalidLedger3, roadmapPath), TraceabilityValidationError);
    
    const invalidLedger4 = [...validLedger];
    invalidLedger4[0] = { ...invalidLedger4[0], activeModule: undefined }; // Missing activeModule
    assert.throws(() => validateFindingLedger(invalidLedger4, roadmapPath), TraceabilityValidationError);

  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
