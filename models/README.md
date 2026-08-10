# Model weights

Place trained `.tflite` files here, then add a matching entry to `manifest.json`.
`npm run sync:models` copies them into the app bundle and regenerates the require map;
it runs automatically on `npm start` and `npm run prebuild`.

Expected entries once training completes:

| id                | stage | task                                  |
|-------------------|-------|---------------------------------------|
| `fruit_detector`  | 1     | Detect and localise banana/mango/papaya |
| `variety_banana`  | 2     | Classify 4 banana varieties            |
| `variety_mango`   | 2     | Classify 3 mango varieties             |
| `variety_papaya`  | 2     | Classify 4 papaya varieties            |
| `disease_detector`| 3     | Detect disease on the cropped fruit    |

Compute a checksum with `sha256sum <file>` (or `certutil -hashfile <file> SHA256` on Windows).

The app builds, installs and runs with this directory empty.
