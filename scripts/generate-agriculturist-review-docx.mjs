import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import YAML from 'yaml';

const root = resolve(import.meta.dirname, '..');
const outputPath = resolve(
  root,
  process.argv[2] ?? 'docs/PrustasAI-Disease-Remedy-Agriculturist-Review-Complete-YAML.docx',
);
const specPath = resolve(root, '.tmp-agriculturist-review-docx-spec.json');
const diseaseDraft = YAML.parse(readFileSync(resolve(root, 'knowledge/disease-remedy-draft.yaml'), 'utf8'));
const sourceDraft = YAML.parse(readFileSync(resolve(root, 'knowledge/sources-draft.yaml'), 'utf8'));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  specPath,
  JSON.stringify({ diseaseDraft, sourceDraft, outputPath }, null, 2),
  'utf8',
);

const python = process.env.PRUSTASAI_PYTHON ?? 'python';
const result = spawnSync(
  python,
  [resolve(root, 'scripts/generate-agriculturist-review-docx.py'), specPath],
  { cwd: root, encoding: 'utf8' },
);
rmSync(specPath, { force: true });

if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}
process.stdout.write(result.stdout);
