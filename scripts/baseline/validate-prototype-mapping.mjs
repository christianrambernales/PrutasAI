export class PrototypeMappingValidationError extends Error {}

export function validatePrototypeMapping(mappingRows, canonical) {
  const expectedIds = new Set([
    ...canonical.screenIds,
    ...canonical.tokenIds,
    ...canonical.interactionIds
  ]);
  
  const seenIds = new Set();
  const errors = [];

  for (const row of mappingRows) {
    if (!expectedIds.has(row.id)) {
      errors.push(`Unknown or invalid mapping ID: ${row.id}`);
    }
    
    if (seenIds.has(row.id)) {
      errors.push(`Duplicate mapping ID: ${row.id}`);
    }
    seenIds.add(row.id);

    if (row.targetPhase < 2 || row.targetPhase > 7) {
      errors.push(`Mapping ${row.id}: targetPhase must be between 2 and 7, got ${row.targetPhase}`);
    }

    const hasActiveModule = Boolean(row.activeModule);
    const hasNoActiveAnalogue = Boolean(row['no-active-analogue']);
    
    if (hasActiveModule && hasNoActiveAnalogue) {
      errors.push(`Mapping ${row.id}: must have exactly one of activeModule or no-active-analogue, got both`);
    } else if (!hasActiveModule && !hasNoActiveAnalogue) {
      errors.push(`Mapping ${row.id}: must have exactly one of activeModule or no-active-analogue, got neither`);
    }
    
    if (!row.prototypeProvenance) {
      errors.push(`Mapping ${row.id}: missing non-empty prototypeProvenance`);
    }
    
    if (!row.runtimeProvenance) {
      errors.push(`Mapping ${row.id}: missing non-empty runtimeProvenance`);
    }
  }

  for (const expected of expectedIds) {
    if (!seenIds.has(expected)) {
      errors.push(`Missing expected mapping ID: ${expected}`);
    }
  }

  if (errors.length > 0) {
    throw new PrototypeMappingValidationError('Prototype mapping validation failed:\n' + errors.join('\n'));
  }
}

import { fileURLToPath } from 'node:url';

// CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { readFileSync } = await import('node:fs');
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node validate-prototype-mapping.mjs <path-to-json>');
    process.exit(1);
  }
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    validatePrototypeMapping(data.mappingRows, data.canonical);
    console.log('Prototype mapping validation passed.');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
