import { freshDb, sampleScan } from '../testing/scanFixtures';
import {
  insertScan,
  findScan,
  listScanGroups,
  listTrashedScans,
  pendingScans,
  markSynced,
  markNeedsAttention,
  markConflict,
  scheduleScanRetry,
  countScansBySyncStatus,
  claimUnownedScans,
  removeLocalAccountScans,
  softDeleteScan,
} from '../repositories/scans';
import {
  insertConversation,
  insertMessage,
  listActiveConversations,
  listTrashedConversations,
  findConversation,
  listMessages,
  lastMessages,
  pendingConversations,
  pendingMessages,
  markConversationSynced,
  markConversationNeedsAttention,
  markConversationConflict,
  scheduleConversationRetry,
  countConversationsBySyncStatus,
  claimUnownedConversations,
  removeLocalAccountConversations,
} from '../repositories/conversations';

describe('Local Account Partitioning & Ownership Security (D-06, D-07, D-10, D-11, D-12)', () => {
  const NOW = '2026-09-19T10:00:00.000Z';

  describe('Scan repository isolation', () => {
    test('signed-out scope sees only unowned scans; signed-in sees own + unowned; never another account', () => {
      const db = freshDb();

      insertScan(db, sampleScan({ uuid: 's_unowned', accountId: null }));
      insertScan(db, sampleScan({ uuid: 's_user_a', accountId: 'user_a' }));
      insertScan(db, sampleScan({ uuid: 's_user_b', accountId: 'user_b' }));

      // 1. Signed out (null)
      const signedOutGroups = listScanGroups(db, { activeAccountId: null });
      const signedOutIds = signedOutGroups.flatMap(g => g.scans.map(s => s.id));
      expect(signedOutIds).toEqual(['s_unowned']);
      expect(findScan(db, 's_unowned', { activeAccountId: null })).not.toBeNull();
      expect(findScan(db, 's_user_a', { activeAccountId: null })).toBeNull();
      expect(findScan(db, 's_user_b', { activeAccountId: null })).toBeNull();

      // 2. Signed in as user_a
      const userAGroups = listScanGroups(db, { activeAccountId: 'user_a' });
      const userAIds = userAGroups.flatMap(g => g.scans.map(s => s.id)).sort();
      expect(userAIds).toEqual(['s_unowned', 's_user_a'].sort());
      expect(findScan(db, 's_unowned', { activeAccountId: 'user_a' })).not.toBeNull();
      expect(findScan(db, 's_user_a', { activeAccountId: 'user_a' })).not.toBeNull();
      expect(findScan(db, 's_user_b', { activeAccountId: 'user_a' })).toBeNull();

      // 3. Signed in as user_b
      const userBGroups = listScanGroups(db, { activeAccountId: 'user_b' });
      const userBIds = userBGroups.flatMap(g => g.scans.map(s => s.id)).sort();
      expect(userBIds).toEqual(['s_unowned', 's_user_b'].sort());
      expect(findScan(db, 's_user_b', { activeAccountId: 'user_b' })).not.toBeNull();
      expect(findScan(db, 's_user_a', { activeAccountId: 'user_b' })).toBeNull();
    });

    test('trash queries enforce account scope', () => {
      const db = freshDb();

      insertScan(db, sampleScan({ uuid: 's_unowned', accountId: null }));
      insertScan(db, sampleScan({ uuid: 's_user_a', accountId: 'user_a' }));
      insertScan(db, sampleScan({ uuid: 's_user_b', accountId: 'user_b' }));

      softDeleteScan(db, 's_unowned', NOW, { activeAccountId: null });
      softDeleteScan(db, 's_user_a', NOW, { activeAccountId: 'user_a' });
      softDeleteScan(db, 's_user_b', NOW, { activeAccountId: 'user_b' });

      // User A trashed list
      const trashedA = listTrashedScans(db, { activeAccountId: 'user_a' });
      const trashedAIds = trashedA.map(s => s.id).sort();
      expect(trashedAIds).toEqual(['s_unowned', 's_user_a'].sort());
      expect(trashedAIds).not.toContain('s_user_b');

      // Signed out trashed list
      const trashedOut = listTrashedScans(db, { activeAccountId: null });
      expect(trashedOut.map(s => s.id)).toEqual(['s_unowned']);
    });

    test('claimUnownedScans atomically claims only unowned rows and preserves existing account ownership', () => {
      const db = freshDb();

      insertScan(db, sampleScan({ uuid: 's_unowned_1', accountId: null }));
      insertScan(db, sampleScan({ uuid: 's_unowned_2', accountId: null }));
      insertScan(db, sampleScan({ uuid: 's_user_a', accountId: 'user_a' }));

      const claimedCount = claimUnownedScans(db, 'user_b');
      expect(claimedCount).toBe(2);

      // Verify unowned scans are now owned by user_b
      const s1 = findScan(db, 's_unowned_1', { activeAccountId: 'user_b' });
      expect(s1?.accountId).toBe('user_b');
      expect(s1?.syncStatus).toBe('pending');

      // Verify user_a scan remained owned by user_a
      const sA = findScan(db, 's_user_a', { activeAccountId: 'user_a' });
      expect(sA?.accountId).toBe('user_a');
      expect(findScan(db, 's_user_a', { activeAccountId: 'user_b' })).toBeNull();

      // Second claim finds no unowned rows
      expect(claimUnownedScans(db, 'user_b')).toBe(0);
    });

    test('state transitions and owner-checked updates prevent cross-account modification', () => {
      const db = freshDb();

      insertScan(db, sampleScan({ uuid: 's_a', accountId: 'user_a', syncStatus: 'pending' }));

      // User B cannot mark User A scan synced
      const updatedByB = markSynced(db, 's_a', NOW, { activeAccountId: 'user_b' });
      expect(updatedByB).toBe(false);

      // User A can mark needs-attention
      const markedAttention = markNeedsAttention(db, 's_a', 'ERR_FORBIDDEN', { activeAccountId: 'user_a' });
      expect(markedAttention).toBe(true);
      const scanAfterAttention = findScan(db, 's_a', { activeAccountId: 'user_a' });
      expect(scanAfterAttention?.syncStatus).toBe('needs_attention');
      expect(scanAfterAttention?.syncErrorCode).toBe('ERR_FORBIDDEN');

      // User A can mark conflict
      const markedConflict = markConflict(db, 's_a', 'ERR_VERSION_CONFLICT', { activeAccountId: 'user_a' });
      expect(markedConflict).toBe(true);
      const scanAfterConflict = findScan(db, 's_a', { activeAccountId: 'user_a' });
      expect(scanAfterConflict?.syncStatus).toBe('conflict');

      // Schedule retry puts row back in pending with incremented retry count
      const scheduled = scheduleScanRetry(db, 's_a', '2026-09-20T00:00:00.000Z', 'ERR_NETWORK', { activeAccountId: 'user_a' });
      expect(scheduled).toBe(true);
      const scanAfterRetry = findScan(db, 's_a', { activeAccountId: 'user_a' });
      expect(scanAfterRetry?.syncStatus).toBe('pending');
      expect(scanAfterRetry?.retryCount).toBe(1);
      expect(scanAfterRetry?.nextRetryAt).toBe('2026-09-20T00:00:00.000Z');

      // Backoff query filtering
      const queueBeforeDue = pendingScans(db, 50, { activeAccountId: 'user_a' }, '2026-09-19T12:00:00.000Z');
      expect(queueBeforeDue).toHaveLength(0);

      const queueAfterDue = pendingScans(db, 50, { activeAccountId: 'user_a' }, '2026-09-21T00:00:00.000Z');
      expect(queueAfterDue).toHaveLength(1);
      expect(queueAfterDue[0].uuid).toBe('s_a');

      // Counts by sync status
      const counts = countScansBySyncStatus(db, { activeAccountId: 'user_a' });
      expect(counts.pending).toBe(1);
      expect(counts.synced).toBe(0);
      expect(counts.needs_attention).toBe(0);
      expect(counts.conflict).toBe(0);
    });

    test('removeLocalAccountScans deletes only the target account rows and returns owned photo URIs', () => {
      const db = freshDb();

      insertScan(db, sampleScan({ uuid: 's_a_owned', accountId: 'user_a', imageUri: 'file:///photo_a_owned.jpg', isOwnedPhoto: true }));
      insertScan(db, sampleScan({ uuid: 's_a_cached', accountId: 'user_a', imageUri: 'file:///photo_a_cached.jpg', isOwnedPhoto: false }));
      insertScan(db, sampleScan({ uuid: 's_b', accountId: 'user_b', imageUri: 'file:///photo_b.jpg', isOwnedPhoto: true }));
      insertScan(db, sampleScan({ uuid: 's_unowned', accountId: null, imageUri: 'file:///photo_unowned.jpg', isOwnedPhoto: true }));

      const removalResult = removeLocalAccountScans(db, 'user_a');
      expect(removalResult.removedCount).toBe(2);
      expect(removalResult.ownedPhotoUris).toEqual(['file:///photo_a_owned.jpg']);

      // Account A scans are gone
      expect(findScan(db, 's_a_owned', { activeAccountId: 'user_a' })).toBeNull();
      expect(findScan(db, 's_a_cached', { activeAccountId: 'user_a' })).toBeNull();

      // Account B and unowned scans remain intact
      expect(findScan(db, 's_b', { activeAccountId: 'user_b' })).not.toBeNull();
      expect(findScan(db, 's_unowned', { activeAccountId: null })).not.toBeNull();
    });

    test('replaying insertScan with existing UUID cannot reassign ownership', () => {
      const db = freshDb();

      insertScan(db, sampleScan({ uuid: 's1', accountId: 'user_a' }));
      // Attempt forged reassignment to user_b
      insertScan(db, sampleScan({ uuid: 's1', accountId: 'user_b' }));

      const scan = findScan(db, 's1', { activeAccountId: 'user_a' });
      expect(scan?.accountId).toBe('user_a');
      expect(findScan(db, 's1', { activeAccountId: 'user_b' })).toBeNull();
    });
  });

  describe('Conversation and message repository isolation', () => {
    test('signed-out sees unowned conversations; signed-in sees own + unowned; never another account', () => {
      const db = freshDb();

      insertConversation(db, { uuid: 'c_unowned', title: 'Unowned Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: null });
      insertMessage(db, { uuid: 'm_unowned', conversationId: 'c_unowned', role: 'user', kind: null, text: 'hi unowned', verdictJson: null, createdAt: NOW });

      insertConversation(db, { uuid: 'c_user_a', title: 'User A Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: 'user_a' });
      insertMessage(db, { uuid: 'm_user_a', conversationId: 'c_user_a', role: 'user', kind: null, text: 'hi user A', verdictJson: null, createdAt: NOW });

      insertConversation(db, { uuid: 'c_user_b', title: 'User B Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: 'user_b' });
      insertMessage(db, { uuid: 'm_user_b', conversationId: 'c_user_b', role: 'user', kind: null, text: 'hi user B', verdictJson: null, createdAt: NOW });

      // 1. Signed out
      const signedOutConvs = listActiveConversations(db, { activeAccountId: null });
      expect(signedOutConvs.map(c => c.uuid)).toEqual(['c_unowned']);
      expect(findConversation(db, 'c_unowned', { activeAccountId: null })).not.toBeNull();
      expect(findConversation(db, 'c_user_a', { activeAccountId: null })).toBeNull();
      expect(findConversation(db, 'c_user_b', { activeAccountId: null })).toBeNull();

      expect(listMessages(db, 'c_unowned', { activeAccountId: null })).toHaveLength(1);
      expect(listMessages(db, 'c_user_a', { activeAccountId: null })).toHaveLength(0);

      // 2. User A
      const userAConvs = listActiveConversations(db, { activeAccountId: 'user_a' });
      expect(userAConvs.map(c => c.uuid).sort()).toEqual(['c_unowned', 'c_user_a'].sort());
      expect(listMessages(db, 'c_user_a', { activeAccountId: 'user_a' })).toHaveLength(1);
      expect(listMessages(db, 'c_user_b', { activeAccountId: 'user_a' })).toHaveLength(0);

      // 3. User B
      const userBConvs = listActiveConversations(db, { activeAccountId: 'user_b' });
      expect(userBConvs.map(c => c.uuid).sort()).toEqual(['c_unowned', 'c_user_b'].sort());
      expect(listMessages(db, 'c_user_b', { activeAccountId: 'user_b' })).toHaveLength(1);
      expect(listMessages(db, 'c_user_a', { activeAccountId: 'user_b' })).toHaveLength(0);
    });

    test('message creation rejects parent ownership mismatch and inherits parent owner', () => {
      const db = freshDb();

      insertConversation(db, { uuid: 'c_a', title: 'A Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: 'user_a' });

      // Explicit mismatch throws
      expect(() => {
        insertMessage(db, {
          uuid: 'm_forged',
          conversationId: 'c_a',
          role: 'user',
          kind: null,
          text: 'forged',
          verdictJson: null,
          createdAt: NOW,
          accountId: 'user_b',
        });
      }).toThrow(/does not match parent conversation owner/);

      // Message with matching accountId succeeds
      expect(() => {
        insertMessage(db, {
          uuid: 'm_valid_a',
          conversationId: 'c_a',
          role: 'user',
          kind: null,
          text: 'valid a',
          verdictJson: null,
          createdAt: NOW,
          accountId: 'user_a',
        });
      }).not.toThrow();

      // Message without accountId inherits parent ownership
      insertMessage(db, {
        uuid: 'm_inherit',
        conversationId: 'c_a',
        role: 'user',
        kind: null,
        text: 'inherited',
        verdictJson: null,
        createdAt: NOW,
      });

      const msgs = listMessages(db, 'c_a', { activeAccountId: 'user_a' });
      expect(msgs).toHaveLength(2);
      expect(msgs[1].accountId).toBe('user_a');
    });

    test('claimUnownedConversations claims conversations and messages in one transaction and never touches other accounts', () => {
      const db = freshDb();

      insertConversation(db, { uuid: 'c_u', title: 'Unowned Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: null });
      insertMessage(db, { uuid: 'm_u1', conversationId: 'c_u', role: 'user', text: 'm1', kind: null, verdictJson: null, createdAt: NOW });
      insertMessage(db, { uuid: 'm_u2', conversationId: 'c_u', role: 'assistant', text: 'm2', kind: null, verdictJson: null, createdAt: NOW });

      insertConversation(db, { uuid: 'c_a', title: 'User A Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: 'user_a' });
      insertMessage(db, { uuid: 'm_a', conversationId: 'c_a', role: 'user', text: 'ma', kind: null, verdictJson: null, createdAt: NOW });

      const claimResult = claimUnownedConversations(db, 'user_b');
      expect(claimResult).toEqual({ claimedConversations: 1, claimedMessages: 2 });

      // c_u and child messages now belong to user_b
      const claimedConv = findConversation(db, 'c_u', { activeAccountId: 'user_b' });
      expect(claimedConv?.accountId).toBe('user_b');
      expect(claimedConv?.syncStatus).toBe('pending');

      const claimedMsgs = listMessages(db, 'c_u', { activeAccountId: 'user_b' });
      expect(claimedMsgs).toHaveLength(2);
      expect(claimedMsgs[0].accountId).toBe('user_b');
      expect(claimedMsgs[1].accountId).toBe('user_b');

      // User A records remain completely untouched
      const aConv = findConversation(db, 'c_a', { activeAccountId: 'user_a' });
      expect(aConv?.accountId).toBe('user_a');
      expect(findConversation(db, 'c_a', { activeAccountId: 'user_b' })).toBeNull();
    });

    test('conversation state transitions and scheduled retry', () => {
      const db = freshDb();

      insertConversation(db, { uuid: 'c_a', title: 'A Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: 'user_a', syncStatus: 'pending' });

      // Owner check: user B cannot modify
      expect(markConversationSynced(db, 'c_a', NOW, { activeAccountId: 'user_b' })).toBe(false);

      // User A marks needs attention
      expect(markConversationNeedsAttention(db, 'c_a', 'ERR_PERM', { activeAccountId: 'user_a' })).toBe(true);
      let conv = findConversation(db, 'c_a', { activeAccountId: 'user_a' });
      expect(conv?.syncStatus).toBe('needs_attention');

      // User A marks conflict
      expect(markConversationConflict(db, 'c_a', 'ERR_CONFLICT', { activeAccountId: 'user_a' })).toBe(true);
      conv = findConversation(db, 'c_a', { activeAccountId: 'user_a' });
      expect(conv?.syncStatus).toBe('conflict');

      // Retry scheduling
      expect(scheduleConversationRetry(db, 'c_a', '2026-09-20T00:00:00.000Z', 'ERR_RETRY', { activeAccountId: 'user_a' })).toBe(true);
      conv = findConversation(db, 'c_a', { activeAccountId: 'user_a' });
      expect(conv?.syncStatus).toBe('pending');
      expect(conv?.retryCount).toBe(1);
      expect(conv?.nextRetryAt).toBe('2026-09-20T00:00:00.000Z');

      // Queue checks
      expect(pendingConversations(db, 50, { activeAccountId: 'user_a' }, '2026-09-19T12:00:00.000Z')).toHaveLength(0);
      expect(pendingConversations(db, 50, { activeAccountId: 'user_a' }, '2026-09-21T00:00:00.000Z')).toHaveLength(1);

      const counts = countConversationsBySyncStatus(db, { activeAccountId: 'user_a' });
      expect(counts.pending).toBe(1);
    });

    test('removeLocalAccountConversations isolates removal to specified account only', () => {
      const db = freshDb();

      insertConversation(db, { uuid: 'c_a', title: 'A Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: 'user_a' });
      insertMessage(db, { uuid: 'm_a', conversationId: 'c_a', role: 'user', text: 'ma', kind: null, verdictJson: null, createdAt: NOW });

      insertConversation(db, { uuid: 'c_b', title: 'B Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: 'user_b' });
      insertMessage(db, { uuid: 'm_b', conversationId: 'c_b', role: 'user', text: 'mb', kind: null, verdictJson: null, createdAt: NOW });

      insertConversation(db, { uuid: 'c_u', title: 'U Conv', deviceId: 'd1', createdAt: NOW, updatedAt: NOW, accountId: null });
      insertMessage(db, { uuid: 'm_u', conversationId: 'c_u', role: 'user', text: 'mu', kind: null, verdictJson: null, createdAt: NOW });

      const removalResult = removeLocalAccountConversations(db, 'user_a');
      expect(removalResult).toEqual({ removedConversations: 1, removedMessages: 1 });

      // User A is gone
      expect(findConversation(db, 'c_a', { activeAccountId: 'user_a' })).toBeNull();
      expect(listMessages(db, 'c_a', { activeAccountId: 'user_a' })).toHaveLength(0);

      // User B and unowned remain
      expect(findConversation(db, 'c_b', { activeAccountId: 'user_b' })).not.toBeNull();
      expect(listMessages(db, 'c_b', { activeAccountId: 'user_b' })).toHaveLength(1);
      expect(findConversation(db, 'c_u', { activeAccountId: null })).not.toBeNull();
      expect(listMessages(db, 'c_u', { activeAccountId: null })).toHaveLength(1);
    });
  });
});
