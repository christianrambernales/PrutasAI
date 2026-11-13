# Owner-approved model import

The checked-in `manifest.json` and `approval.json` are intentionally empty. This
is the valid model-free source state. The repository contains no owner-approved
weights, tensor contracts, labels, confidence values, hashes, or model versions.
Do not create placeholder approval records or use test fixtures as model data.

## Allowed roles and fruit scope

Each role may appear at most once in the manifest, and each filename may appear
only once. Every entry must state the fruits covered by the owner-approved
artifact. Stage numbers are fixed by role.

| Role ID | Stage | Allowed fruit scope |
|---|---:|---|
| `fruit_detector` | 1 | banana, mango, papaya, or an owner-approved subset |
| `variety_banana` | 2 | banana |
| `variety_mango` | 2 | mango |
| `variety_papaya` | 2 | papaya |
| `disease_detector` | 3 | banana, mango, papaya, or an owner-approved subset |

A fruit-specific variety role must name its matching fruit. A later role does
not make an earlier role available. Partial sets describe only the validated
role and fruit combinations actually present.

## Owner approval record

Before importing any artifact, obtain the exact `.tflite` file and a completed,
recorded owner approval for that file. The approval must bind the role, exact
filename, version, SHA-256, fruit scope, and `min_confidence` value to the
artifact. It must also supply the actual input and output tensor names, approved
shape contract and dtypes, output-name-to-index-label mapping, and all signature
keys with their input/output alias-to-tensor bindings. Record the approver's
identity and approval timestamp. Use the actual artifact and owner decision;
never infer or invent a filename, version, tensor dimension, label, threshold,
fruit scope, or approval.

The machine-readable requirements are in
[`approval-contract.schema.json`](approval-contract.schema.json). For each
approval, `status` must be `owner_approved`. Its `id`, `file`, `version`,
`sha256`, `fruits`, and `min_confidence` must exactly match the corresponding
manifest entry. Input/output `shape` values in the approval are checked against
the actual LiteRT `shape_signature` (including `-1` for a dynamic dimension).
Generated JSON records the inspector's `shape` and `shapeSignature` alongside
the dtype. List each actual signature key and its bindings. Use
`signatures: []` only when the inspected model exposes no signatures.

The source manifest entry fields are `id`, `stage`, `file`, `version`, `sha256`,
`fruits`, and `min_confidence`. `file` must be a safe `.tflite` basename inside
`models/`. The manifest schema version remains `1` unless a reviewed code change
updates the contract.

## Import and validate a future model set

1. Obtain the owner-approved files and complete contracts described above. A
   nonempty `manifest.json` is an import attempt: every declared file must be
   present, approved, hash-matched, and compatible with the real artifact.
2. Put each exact approved `.tflite` file directly under `models/`. Model files
   are gitignored. Keep them available in the build workspace, but do not add
   weights to Git. Remove or move any unrelated `.tflite` files out of `models/`;
   synchronization rejects unlisted model files.
3. Calculate SHA-256 from each file's exact bytes and enter that same value and
   owner-supplied version in the manifest and approval record:

   ```powershell
   $modelFile = 'replace-with-the-owner-supplied-basename.tflite'
   Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path 'models' $modelFile)
   ```

   ```sh
   sha256sum models/OWNER-SUPPLIED-FILENAME.tflite
   ```

   Replace the path with the actual owner-supplied filename; these commands do
   not name or provide an approved model.
4. Edit `manifest.json` and `approval.json` from the real owner record. Do not
   copy example dimensions, labels, or values from tests. Check the contract
   structure with:

   ```sh
   node --test scripts/model-contract.test.mjs
   ```

5. For a nonempty import only, create an isolated Python 3.12 environment and
   install the pinned inspector dependency from
   [`ml/requirements-model-inspection.txt`](../ml/requirements-model-inspection.txt):

   ```powershell
   py -3.12 -m venv "$env:TEMP\prutasai-model-inspection"
   $inspectorPython = Join-Path $env:TEMP 'prutasai-model-inspection\Scripts\python.exe'
   & $inspectorPython -m pip install -r ml/requirements-model-inspection.txt
   $env:PYTHON = $inspectorPython
   npm run sync:models
   ```

   ```sh
   python3.12 -m venv "${TMPDIR:-/tmp}/prutasai-model-inspection"
   "${TMPDIR:-/tmp}/prutasai-model-inspection/bin/python" -m pip install -r ml/requirements-model-inspection.txt
   export PYTHON="${TMPDIR:-/tmp}/prutasai-model-inspection/bin/python"
   npm run sync:models
   ```

   Keep `PYTHON` set to this environment for subsequent root commands in the
   same shell, including `npm start` and `npm run build:apk`. The pinned
   dependency is `ai-edge-litert==2.2.0`. The inspector reads structural tensor
   and signature metadata; it does not run model inference.
   Empty-manifest synchronization does not require Python or LiteRT.
6. Review the generated `app/src/core/ml/verifiedModels.json`,
   `app/src/core/ml/manifest.json`, `app/src/core/ml/bundledModels.ts`, and
   `app/assets/models/` as one synchronized output set. Confirm each role,
   filename, version, hash, fruit scope, approval, tensor, signature, and label
   mapping against the source files and owner record. Expected generated status
   fields are `validation_status: "build_validated"` and
   `inference_status: "unverified"`. The app's `Installed and validated` state
   must remain paired with `Inference unverified`. Its `How to import models`
   action points to this repository workflow and does not import a file into a
   running app.
7. Run the focused contract/sync tests and typecheck, then complete the package
   checks and restart/rebuild instructions in [`docs/BUILDING.md`](../docs/BUILDING.md).
   Script fixtures test the validation and transaction logic; they do not stand
   in for inspection of the owner-supplied artifact.

## Failure and rollback

Missing or unlisted files, a hash/version/approval mismatch, invalid tensor or
signature metadata, or LiteRT inspection failure stops synchronization with a
nonzero result. Validation occurs before replacing generated outputs; failed
validation leaves the last valid bundle unchanged. Publication failures trigger
rollback. If rollback itself fails, synchronization reports and retains a
recovery directory; do not build or launch from that partially published state.
Preserve the reported recovery directory, repair the source contract or restore
the last known-good input set, and rerun `npm run sync:models` before building.

## Return to the model-free baseline

1. Remove all model entries from `manifest.json` and restore its empty
   `models` array. Restore `approval.json` with an empty `approvals` array.
2. Move or remove every `.tflite` file from `models/`. The sync command rejects
   unlisted artifacts even when the manifest is empty. Keep any retained owner
   files in their approved storage location outside this directory.
3. Run `npm run sync:models`. It publishes an empty asset directory and empty
   generated model map, manifest, and verified metadata. No Python environment
   is needed. Then run the
   model-free checks in `docs/BUILDING.md` and restart or rebuild the app.
4. Confirm the app continues to report analysis as unavailable and results as
   not analyzed. File presence or build validation never enables inference.

## Inference evidence is separate

Sync and package builds establish only that the approved bytes and metadata
passed build validation and entered the app bundle. They do not establish that
Android loaded or ran a model, produced a correct result, or supports a disease
claim. The current application has no model inference path in this phase, so
`Inference unverified` remains the accurate state. A future detection claim
requires a real Android runtime path and direct device evidence for that exact
build and model set; record the APK/device/OS, model role/version/hash, test
input provenance, observed execution, and result separately from build checks.
