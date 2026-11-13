import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { RouteBody } from '../render/routes';
import { TrashScreen } from '../../features/trash/TrashScreen';
import { makeShell } from '../../testing/shellFixture';
import {
  insertConversation, listTrashedConversations, softDeleteConversation,
} from '../../core/db/repositories/conversations';
import { deleteConversationEverywhere } from '../../core/sync/purgeTrash';

jest.mock('../../core/sync/purgeTrash', () => ({ deleteConversationEverywhere: jest.fn() }));

const NOW = '2026-09-23T00:00:00.000Z';

test('Trash route rejects a restore outside the active account scope', () => {
  const shell = makeShell();
  shell.data.accountScope = { activeAccountId: 'account-a' };
  insertConversation(shell.data.db, {
    uuid: 'private-b', title: 'Private', deviceId: 'device',
    createdAt: NOW, updatedAt: NOW, accountId: 'account-b',
  });
  softDeleteConversation(shell.data.db, 'private-b', NOW, { activeAccountId: 'account-b' });
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<RouteBody shell={shell} route={{ name: 'trash' }} />); });
  const screen = tree.root.findAllByType(TrashScreen)[0];

  expect(() => screen.props.onRestore(['private-b'])).toThrow('Restore unavailable');
  expect(listTrashedConversations(shell.data.db, { activeAccountId: 'account-b' })).toHaveLength(1);
  expect(shell.data.bumpData).not.toHaveBeenCalled();
});

test('Trash route reports a pending permanent delete instead of clearing its row', async () => {
  const shell = makeShell();
  shell.data.accountScope = { activeAccountId: 'account-a' };
  insertConversation(shell.data.db, {
    uuid: 'owned-a', title: 'Owned', deviceId: 'device',
    createdAt: NOW, updatedAt: NOW, accountId: 'account-a',
  });
  softDeleteConversation(shell.data.db, 'owned-a', NOW, shell.data.accountScope);
  shell.data.trashedConversations = listTrashedConversations(shell.data.db, shell.data.accountScope);
  jest.mocked(deleteConversationEverywhere).mockResolvedValueOnce(false);
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<RouteBody shell={shell} route={{ name: 'trash' }} />); });

  await expect(tree.root.findAllByType(TrashScreen)[0].props.onDeleteForever(['owned-a']))
    .rejects.toThrow('Permanent deletion unavailable');
  expect(deleteConversationEverywhere).toHaveBeenCalledWith(
    shell.data.db, 'owned-a', undefined, shell.data.accountScope,
  );
  expect(listTrashedConversations(shell.data.db, shell.data.accountScope)).toHaveLength(1);
  expect(shell.data.bumpData).not.toHaveBeenCalled();
});
