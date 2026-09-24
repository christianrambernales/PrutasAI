# Model import contract

The checked-in `manifest.json` and `approval.json` are intentionally empty. This
is the valid model-free source state. There are no approved weight files,
production tensor dimensions, labels, thresholds, hashes, or model versions in
the repository. Do not create examples that could be mistaken for an owner
approval.

## Allowed roles and fruit scope

The `id` is one model role, and each role can appear at most once in a manifest.
Every entry names its `fruits` applicability explicitly.

| Role ID | Stage | Allowed fruit scope |
|---|---:|---|
| `fruit_detector` | 1 | banana, mango, papaya |
| `variety_banana` | 2 | banana |
| `variety_mango` | 2 | mango |
| `variety_papaya` | 2 | papaya |
| `disease_detector` | 3 | banana, mango, papaya |

The general detector roles may declare a supported subset when the actual model
and owner approval cover only that subset. A fruit-specific variety role must
declare its matching fruit. A later role does not establish that an earlier
role is available.

## Required source and approval fields

Each nonempty `manifest.json` entry contains `id`, `stage`, `file`, `version`,
`sha256`, `fruits`, and `min_confidence`. `file` is a safe basename ending in
`.tflite`; it cannot point outside `models/`. The version, checksum, fruit scope,
and confidence value must match a separate entry in `approval.json`.

Each approval record also supplies `status: "owner_approved"`, the owner's
identity and approval date, nonempty input and output tensor names, the actual
shape dimensions and dtypes, and an index-to-label mapping that identifies its
output tensor. The checked-in
[approval contract schema](approval-contract.schema.json) defines that record
shape. The pure contract validator can be run with:

```sh
node --test scripts/model-contract.test.mjs
```

For a future real import, calculate SHA-256 from the exact artifact bytes and
record it with the same version in both files. Supply tensor, label, threshold,
fruit, and version values only from the actual artifact and the owner's review;
do not infer or invent them. The model synchronization task separately verifies
the artifact bytes and enforces transactional bundle publication.

The application remains model-free while both arrays are empty and must report
analysis as unavailable. File validation alone will not establish that inference
works on a device.
