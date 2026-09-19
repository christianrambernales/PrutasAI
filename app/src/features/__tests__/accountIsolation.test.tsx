import { freshDb } from '../../core/db/testing/scanFixtures';
import { findScan, insertScan, listScanGroups } from '../../core/db/repositories/scans';
import { insertConversation, listActiveConversations } from '../../core/db/repositories/conversations';

const NOW = '2026-09-19T12:00:00.000Z';
const ACCOUNT_A = { activeAccountId: 'account-a' };
const ACCOUNT_B = { activeAccountId: 'account-b' };

test('shared-device reads keep retained scan and conversation ids owner scoped', () => {
  const db = freshDb();
  insertScan(db, {
    uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', imageUri: 'file:///a.jpg', createdAt: NOW,
    fruitKey: null, fruitConf: null, varietyKey: null, varietyConf: null, bboxJson: null,
    manifestVersion: null, lat: null, lon: null, accountId: 'account-a', isOwnedPhoto: true,
  });
  insertConversation(db, {
    uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', title: 'A only', deviceId: 'device',
    createdAt: NOW, updatedAt: NOW, accountId: 'account-a',
  });

  expect(listScanGroups(db, ACCOUNT_A).flatMap(group => group.scans)).toHaveLength(1);
  expect(listActiveConversations(db, ACCOUNT_A)).toHaveLength(1);
  expect(findScan(db, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ACCOUNT_B)).toBeNull();
  expect(listScanGroups(db, ACCOUNT_B).flatMap(group => group.scans)).toHaveLength(0);
  expect(listActiveConversations(db, ACCOUNT_B)).toHaveLength(0);
});
