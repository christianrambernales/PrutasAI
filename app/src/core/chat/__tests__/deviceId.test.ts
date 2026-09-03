import { migrate } from '../../db/migrate';
import { createTestDriver } from '../../db/testing/betterSqliteDriver';
import { deviceId } from '../deviceId';

function db() {
  const driver = createTestDriver();
  migrate(driver);
  return driver;
}

test('the same install keeps the same id across calls', () => {
  const driver = db();
  expect(deviceId(driver)).toBe(deviceId(driver));
});

test('the id survives a restart, because per-device limiting needs it to', () => {
  const driver = db();
  const first = deviceId(driver);
  const stored = driver.get<{ value: string }>('SELECT value FROM setting WHERE key = ?', [
    'device_id',
  ]);
  expect(stored?.value).toBe(first);
});

test('two installs get different ids', () => {
  expect(deviceId(db())).not.toBe(deviceId(db()));
});

test('the id carries nothing about the device or the person', () => {
  // Hex and a timestamp only: it is a rate-limit key, not an identity.
  expect(deviceId(db())).toMatch(/^[0-9a-f]+-[0-9a-f]{12}$/);
});
