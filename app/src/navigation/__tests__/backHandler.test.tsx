import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { BackHandler } from 'react-native';

import { AppNavigator } from '../AppNavigator';
import { resetAppDatabase, seedConsent, seedLanguagePicked, seedSyncMode } from '../../testing/appDatabase';
import { press } from '../../testing/interaction';
import { BottomNav } from '../../ui';
import { ConsentScreen } from '../../features/consent/ConsentScreen';
import { getSyncMode } from '../../core/db/syncMode';

let backListener: (() => boolean | null | undefined) | null = null;
let backSubscription: jest.SpyInstance;

beforeEach(() => {
  resetAppDatabase();
  seedLanguagePicked();
  seedConsent();
  seedSyncMode();
  backListener = null;
  backSubscription = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    backListener = listener;
    return { remove: jest.fn() } as never;
  });
});

test('Account tab requests consent for an offline install before opening real account content', async () => {
  const db = resetAppDatabase();
  seedLanguagePicked();
  seedSyncMode('offline');
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AppNavigator db={db} />); });
  await act(async () => { tree.root.findAll(node => node.type === BottomNav)[0].props.onSelect('account'); });
  expect(tree.root.findAll(node => node.type === ConsentScreen)).toHaveLength(1);
  expect(tree.root.findAll(node => node.type === BottomNav)).toHaveLength(0);
  act(() => tree.unmount());
});

test('consented Account tab entry preserves offline preference', async () => {
  const db = resetAppDatabase();
  seedLanguagePicked(); seedSyncMode('offline'); seedConsent();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AppNavigator db={db} />); });
  await act(async () => { tree.root.findAll(node => node.type === BottomNav)[0].props.onSelect('account'); });
  expect(tree.root.findAll(node => node.type === BottomNav)[0].props.active).toBe('account');
  expect(getSyncMode(db)).toBe('offline');
  act(() => tree.unmount());
});

afterEach(() => {
  backSubscription.mockRestore();
});

test('hardware Back closes an open conversation sidebar before changing the chat screen', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AppNavigator />); });

  press(tree, 'Assistant');
  press(tree, 'Open conversations');
  expect(tree.root.findAll(node => node.props.accessibilityRole === 'menu').length).toBeGreaterThan(0);

  let handled: boolean | null | undefined;
  act(() => { handled = backListener?.(); });

  expect(handled).toBe(true);
  expect(tree.root.findAll(node => node.props.accessibilityRole === 'menu')).toHaveLength(0);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Open conversations').length).toBeGreaterThan(0);
  act(() => tree.unmount());
});
