import type { SqlDriver } from '../driver';
import { migrate } from '../migrate';
import { seedContent } from '../seed';
import { openDatabase, prepareDatabase } from '../expoSqliteDriver';
import {
  openAppDatabase,
  prepareAppDatabase,
  resetPreparedAppDatabase,
} from '../appDatabase';

jest.mock('../expoSqliteDriver', () => ({
  prepareDatabase: jest.fn(),
  openDatabase: jest.fn(),
}));
jest.mock('../migrate', () => ({ migrate: jest.fn() }));
jest.mock('../seed', () => ({ seedContent: jest.fn() }));

const driver = {} as SqlDriver;

describe('app database preparation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPreparedAppDatabase();
    (prepareDatabase as jest.Mock).mockResolvedValue(undefined);
    (openDatabase as jest.Mock).mockReturnValue(driver);
  });

  test('does not resolve ready until warm-up, migration, and seeding succeed', async () => {
    let releaseWarmup!: () => void;
    (prepareDatabase as jest.Mock).mockReturnValue(new Promise<void>(resolve => {
      releaseWarmup = resolve;
    }));

    const pending = prepareAppDatabase();
    expect(openDatabase).not.toHaveBeenCalled();

    releaseWarmup();
    await expect(pending).resolves.toBe(driver);
    expect(migrate).toHaveBeenCalledWith(driver);
    expect(seedContent).toHaveBeenCalledWith(driver, expect.any(String), '2026.08.10');
    expect(openAppDatabase()).toBe(driver);
    expect(openDatabase).toHaveBeenCalledTimes(1);
  });

  test('a failed preparation can retry without caching a half-ready driver', async () => {
    (migrate as jest.Mock).mockImplementationOnce(() => {
      throw new Error('migration failed');
    });

    await expect(prepareAppDatabase()).rejects.toThrow('migration failed');
    expect(seedContent).not.toHaveBeenCalled();

    await expect(prepareAppDatabase()).resolves.toBe(driver);
    expect(openDatabase).toHaveBeenCalledTimes(2);
    expect(seedContent).toHaveBeenCalledTimes(1);
  });
});
