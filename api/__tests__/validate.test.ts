import { describe, expect, test } from 'vitest';
import { validateScan } from '../_lib/validate';

const VALID = {
  uuid: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  created_at: '2026-08-11T10:30:00.000Z',
  fruit_key: 'banana',
  fruit_conf: 0.96,
  manifest_version: 1,
};

test('a well-formed scan passes', () => {
  expect(validateScan(VALID).ok).toBe(true);
});

test('a missing uuid is rejected', () => {
  const { uuid, ...rest } = VALID;
  expect(validateScan(rest).ok).toBe(false);
});

test('a malformed uuid is rejected', () => {
  expect(validateScan({ ...VALID, uuid: 'not-a-uuid' }).ok).toBe(false);
});

test('an unknown field is rejected rather than ignored', () => {
  const result = validateScan({ ...VALID, is_admin: true });
  expect(result.ok).toBe(false);
  expect(result.ok === false && result.error).toContain('is_admin');
});

test('a confidence outside 0..1 is rejected', () => {
  expect(validateScan({ ...VALID, fruit_conf: 4 }).ok).toBe(false);
  expect(validateScan({ ...VALID, fruit_conf: -0.1 }).ok).toBe(false);
});

test('a remote image_uri is rejected', () => {
  expect(validateScan({ ...VALID, image_uri: 'https://evil.example/x.jpg' }).ok).toBe(false);
  expect(validateScan({ ...VALID, image_uri: 'file:///data/photo.jpg' }).ok).toBe(true);
});

test('an oversized field is rejected', () => {
  expect(validateScan({ ...VALID, bbox_json: 'x'.repeat(600) }).ok).toBe(false);
});

test('bbox_json must parse as JSON', () => {
  expect(validateScan({ ...VALID, bbox_json: '{oops' }).ok).toBe(false);
  expect(validateScan({ ...VALID, bbox_json: '[0,0,1,1]' }).ok).toBe(true);
});

test('SQL in a field is data, not a problem to solve here', () => {
  // Parameterised statements handle this; validation only checks shape.
  expect(validateScan({ ...VALID, fruit_key: "'; DROP TABLE scan;--" }).ok).toBe(false);
});

test('a valid lat/lon pair is accepted', () => {
  expect(validateScan({ ...VALID, lat: 14.5, lon: 121.05 }).ok).toBe(true);
});

test('an out-of-range lat is rejected', () => {
  expect(validateScan({ ...VALID, lat: 91 }).ok).toBe(false);
  expect(validateScan({ ...VALID, lat: -91 }).ok).toBe(false);
});

test('an out-of-range lon is rejected', () => {
  expect(validateScan({ ...VALID, lon: 181 }).ok).toBe(false);
  expect(validateScan({ ...VALID, lon: -181 }).ok).toBe(false);
});

test('a non-number lat or lon is rejected', () => {
  expect(validateScan({ ...VALID, lat: '14.5' }).ok).toBe(false);
  expect(validateScan({ ...VALID, lon: '121.05' }).ok).toBe(false);
});

test('lat and lon are both optional: a scan with neither is still valid', () => {
  expect(validateScan(VALID).ok).toBe(true);
});
