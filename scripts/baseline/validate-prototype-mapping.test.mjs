import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PrototypeMappingValidationError, validatePrototypeMapping } from './validate-prototype-mapping.mjs';

test('validate-prototype-mapping - validatePrototypeMapping', () => {
  const canonical = {
    screenIds: ['SCR-01', 'SCR-02'],
    tokenIds: ['TOK-01', 'TOK-02'],
    interactionIds: ['INT-01']
  };

  const validMapping = [
    { id: 'SCR-01', targetPhase: 2, activeModule: 'app/src/screens/Home.tsx', prototypeProvenance: 'Figma', runtimeProvenance: 'Git' },
    { id: 'SCR-02', targetPhase: 3, 'no-active-analogue': true, prototypeProvenance: 'Figma', runtimeProvenance: 'N/A' },
    { id: 'TOK-01', targetPhase: 4, activeModule: 'app/src/theme.ts', prototypeProvenance: 'Figma', runtimeProvenance: 'Git' },
    { id: 'TOK-02', targetPhase: 5, activeModule: 'app/src/theme.ts', prototypeProvenance: 'Figma', runtimeProvenance: 'Git' },
    { id: 'INT-01', targetPhase: 7, activeModule: 'app/src/components/Button.tsx', prototypeProvenance: 'Figma', runtimeProvenance: 'Git' }
  ];

  assert.doesNotThrow(() => validatePrototypeMapping(validMapping, canonical));

  const missingOne = validMapping.slice(1);
  assert.throws(() => validatePrototypeMapping(missingOne, canonical), PrototypeMappingValidationError);

  const duplicateOne = [...validMapping, validMapping[0]];
  assert.throws(() => validatePrototypeMapping(duplicateOne, canonical), PrototypeMappingValidationError);

  const unknownOne = [...validMapping, { id: 'SCR-03', targetPhase: 2, activeModule: 'foo', prototypeProvenance: 'Figma', runtimeProvenance: 'Git' }];
  assert.throws(() => validatePrototypeMapping(unknownOne, canonical), PrototypeMappingValidationError);

  const invalidPhase = [...validMapping];
  invalidPhase[0] = { ...invalidPhase[0], targetPhase: 8 };
  assert.throws(() => validatePrototypeMapping(invalidPhase, canonical), PrototypeMappingValidationError);

  const bothVerdicts = [...validMapping];
  bothVerdicts[0] = { ...bothVerdicts[0], 'no-active-analogue': true };
  assert.throws(() => validatePrototypeMapping(bothVerdicts, canonical), PrototypeMappingValidationError);
  
  const neitherVerdict = [...validMapping];
  delete neitherVerdict[0].activeModule;
  assert.throws(() => validatePrototypeMapping(neitherVerdict, canonical), PrototypeMappingValidationError);

  const missingProvenance = [...validMapping];
  delete missingProvenance[0].prototypeProvenance;
  assert.throws(() => validatePrototypeMapping(missingProvenance, canonical), PrototypeMappingValidationError);
});
