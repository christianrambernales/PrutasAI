/**
 * expo-sqlite@16.0.10 frames synchronous worker results as a 4-byte
 * little-endian length followed by UTF-8 JSON, but writes that length with
 * `Uint8Array.prototype.set(new Uint32Array([length]))`. Given a source typed
 * array of a different type, `set` converts element-wise rather than copying
 * bytes, so only `length & 0xFF` is stored. The reader takes all four bytes as
 * a Uint32 and recovers `length % 256`.
 *
 * Every synchronous result over 255 bytes was therefore truncated, and
 * `JSON.parse` threw on the fragment. That is what painted the web build white:
 * `listFruits` and its neighbours return multi-kilobyte payloads during
 * AppNavigator's first render.
 *
 * `patches/expo-sqlite+16.0.10.patch` fixes it. These tests exist because a
 * reinstall or version bump that silently drops the patch would otherwise be
 * caught only by opening a browser.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CHANNEL_PATH = join(__dirname, '../../../../node_modules/expo-sqlite/web/WorkerChannel.ts');
const HEADER_BYTES = 4;

describe('the expo-sqlite patch is applied', () => {
  const source = readFileSync(CHANNEL_PATH, 'utf8');

  test('the length prefix is written through a Uint32Array view', () => {
    expect(source).toContain('new Uint32Array(resultBuffer, 0, 1)[0] = length;');
  });

  test('the element-wise write that truncated the length is gone', () => {
    expect(source).not.toContain('resultArray.set(new Uint32Array([length]), 0)');
  });

  test('an oversized result is refused rather than left to time out', () => {
    expect(source).toContain('resultBuffer.byteLength - 4');
  });

  test('the synchronous busy-wait budget is raised above the ~38ms default', () => {
    expect(source).toContain('i > 100_000_000');
    expect(source).not.toContain('i > 1_000_000)');
  });
});

/**
 * Characterisation of the framing itself, independent of the package. These
 * document the property that was broken and pin the endianness assumption: the
 * writer and reader use the same view type, so they agree by construction.
 */
describe('length-prefixed framing', () => {
  function write(buffer: ArrayBuffer, json: string): void {
    const bytes = new TextEncoder().encode(json);
    new Uint32Array(buffer, 0, 1)[0] = bytes.length;
    new Uint8Array(buffer).set(bytes, HEADER_BYTES);
  }

  function read(buffer: ArrayBuffer): string {
    const length = new Uint32Array(buffer, 0, 1)[0];
    const copy = new Uint8Array(length);
    copy.set(new Uint8Array(buffer, HEADER_BYTES, length));
    return new TextDecoder().decode(copy);
  }

  test('a payload far over 255 bytes survives intact', () => {
    const buffer = new ArrayBuffer(64 * 1024);
    const json = JSON.stringify({
      rows: Array.from({ length: 200 }, (_, i) => ({ id: i, name: `fruit-${i}` })),
    });
    expect(json.length).toBeGreaterThan(255);
    write(buffer, json);
    expect(read(buffer)).toBe(json);
  });

  test('a payload whose length is an exact multiple of 256 survives', () => {
    const buffer = new ArrayBuffer(64 * 1024);
    const json = `"${'x'.repeat(512 - 2)}"`;
    expect(json.length % 256).toBe(0);
    write(buffer, json);
    expect(read(buffer)).toBe(json);
  });

  test('the upstream element-wise write stores only the low byte', () => {
    const buffer = new ArrayBuffer(1024);
    new Uint8Array(buffer).set(new Uint32Array([5000]), 0);
    expect(new Uint32Array(buffer, 0, 1)[0]).toBe(5000 & 0xff);
  });
});
