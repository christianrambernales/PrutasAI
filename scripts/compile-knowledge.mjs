import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse } from 'yaml';
import { pathToFileURL, fileURLToPath } from 'node:url';

export class KnowledgeError extends Error {}

const sql = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

function assertContiguous(indices, label) {
  const sorted = [...indices].sort((a, b) => a - b);
  sorted.forEach((n, i) => {
    if (n !== i) throw new KnowledgeError(`${label}: class indices must be contiguous from 0, got [${sorted}]`);
  });
}

export function compileKnowledge(knowledgeDir, opts = {}) {
  const sourcesDoc = parse(readFileSync(join(knowledgeDir, 'sources.yaml'), 'utf8'));
  if (!sourcesDoc || !Array.isArray(sourcesDoc.sources)) {
    throw new KnowledgeError('sources.yaml must have a top-level "sources:" key with an array value');
  }
  const sources = sourcesDoc.sources;
  const taxonomy = opts.taxonomyOverride
    ?? parse(readFileSync(join(knowledgeDir, 'taxonomy.yaml'), 'utf8'));

  const sourceIds = new Set(sources.map(s => s.id));
  const fruits = taxonomy.fruits;
  const varieties = [];
  const diseases = [];
  const remedies = [];
  const classMap = { fruits: [], varieties: {} };

  assertContiguous(fruits.map(f => f.ml_class_index), 'fruits');
  classMap.fruits = [...fruits].sort((a, b) => a.ml_class_index - b.ml_class_index).map(f => f.key);

  for (const fruit of fruits) {
    if (!Array.isArray(fruit.varieties)) {
      throw new KnowledgeError(`fruit '${fruit.key}' must have a "varieties" array`);
    }
    const mlVarieties = fruit.varieties.filter(v => v.is_ml_class);
    assertContiguous(mlVarieties.map(v => v.ml_class_index), `${fruit.key} varieties`);
    classMap.varieties[fruit.key] = [...mlVarieties]
      .sort((a, b) => a.ml_class_index - b.ml_class_index)
      .map(v => v.key);

    for (const v of fruit.varieties) {
      for (const id of v.sources ?? []) {
        if (!sourceIds.has(id)) {
          throw new KnowledgeError(`variety '${v.key}' references unknown source '${id}'`);
        }
      }
      varieties.push({ ...v, fruit: fruit.key, is_ml_class: Boolean(v.is_ml_class), parent: v.parent ?? null });
    }

    for (const d of fruit.diseases ?? []) {
      for (const id of d.sources ?? []) {
        if (!sourceIds.has(id)) {
          throw new KnowledgeError(`disease '${d.key}' references unknown source '${id}'`);
        }
      }
      diseases.push({ ...d, fruit: fruit.key });

      for (const r of d.remedies ?? []) {
        for (const id of r.sources ?? []) {
          if (!sourceIds.has(id)) {
            throw new KnowledgeError(`remedy '${r.key}' references unknown source '${id}'`);
          }
        }
        remedies.push({ ...r, disease: d.key });
      }
    }
  }

  const lines = ['BEGIN TRANSACTION;', 'DELETE FROM remedy;', 'DELETE FROM disease;', 'DELETE FROM variety;', 'DELETE FROM fruit;', 'DELETE FROM source;'];
  for (const s of sources) {
    lines.push(`INSERT INTO source (id, citation, url, retrieved_at) VALUES (${sql(s.id)}, ${sql(s.citation)}, ${sql(s.url)}, ${sql(s.retrieved_at)});`);
  }
  for (const f of fruits) {
    lines.push(`INSERT INTO fruit (key, name_en, name_fil, emoji, ml_class_index) VALUES (${sql(f.key)}, ${sql(f.name.en)}, ${sql(f.name.fil)}, ${sql(f.emoji)}, ${f.ml_class_index});`);
  }
  for (const v of varieties) {
    const idx = v.is_ml_class ? v.ml_class_index : 'NULL';
    lines.push(
      `INSERT INTO variety (key, fruit_key, name_en, name_fil, ml_class_index, is_ml_class, parent_key, source_id) ` +
      `VALUES (${sql(v.key)}, ${sql(v.fruit)}, ${sql(v.name.en)}, ${sql(v.name.fil)}, ${idx}, ${v.is_ml_class ? 1 : 0}, ${sql(v.parent)}, ${sql((v.sources ?? [])[0])});`
    );
  }
  for (const d of diseases) {
    lines.push(`INSERT INTO disease (key, fruit_key, name_en, name_fil, description_en, description_fil, source_id) VALUES (${sql(d.key)}, ${sql(d.fruit)}, ${sql(d.name.en)}, ${sql(d.name.fil)}, ${sql(d.description?.en)}, ${sql(d.description?.fil)}, ${sql((d.sources ?? [])[0])});`);
  }
  for (const r of remedies) {
    lines.push(`INSERT INTO remedy (key, disease_key, name_en, name_fil, instruction_en, instruction_fil, is_prevention, source_id) VALUES (${sql(r.key)}, ${sql(r.disease)}, ${sql(r.name.en)}, ${sql(r.name.fil)}, ${sql(r.instruction?.en)}, ${sql(r.instruction?.fil)}, ${r.is_prevention ? 1 : 0}, ${sql((r.sources ?? [])[0])});`);
  }
  lines.push(`INSERT OR REPLACE INTO setting (key, value) VALUES ('content_version', ${sql(taxonomy.content_version)});`);
  lines.push('COMMIT;');

  return { fruits, varieties, diseases, remedies, sources, classMap, contentVersion: taxonomy.content_version, seedSql: lines.join('\n') + '\n' };
}

function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, 'utf8');
  console.log(`wrote ${path}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const k = compileKnowledge(join(root, 'knowledge'));
  write(join(root, 'app/src/core/db/seed.sql'), k.seedSql);
  write(join(root, 'ml/classes.json'), JSON.stringify(k.classMap, null, 2) + '\n');
  write(join(root, 'app/src/core/types/knowledge.ts'),
    `// Generated by scripts/compile-knowledge.mjs. Do not edit.\n` +
    `export type FruitKey = ${k.fruits.length ? k.fruits.map(f => `'${f.key}'`).join(' | ') : 'never'};\n` +
    `export type VarietyKey = ${k.varieties.length ? k.varieties.map(v => `'${v.key}'`).join(' | ') : 'never'};\n` +
    `export type DiseaseKey = ${k.diseases.length ? k.diseases.map(d => `'${d.key}'`).join(' | ') : 'never'};\n` +
    `export type RemedyKey = ${k.remedies.length ? k.remedies.map(r => `'${r.key}'`).join(' | ') : 'never'};\n` +
    `export const CONTENT_VERSION = '${k.contentVersion}';\n`);
}
