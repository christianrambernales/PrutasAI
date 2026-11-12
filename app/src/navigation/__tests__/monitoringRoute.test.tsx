import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { AppNavigator } from '../AppNavigator';
import { seedStoredScans } from '../../testing/appDatabase';
import { findPressable, textOf } from '../../testing/interaction';
import { ExpoPhotoStore } from '../../core/files/expoPhotoStore';
import { BackHandler } from 'react-native';
import { BottomNav } from '../../ui';
import { CameraCapture } from '../../features/capture/CameraCapture';
import { MonitoringListScreen } from '../../features/monitoring/MonitoringListScreen';
import { MonitoringScreen } from '../../features/monitoring/MonitoringScreen';

async function openMonitoring(tree: ReactTestRenderer, db: ReturnType<typeof seedStoredScans>) {
  const source = db.get<{ uuid: string }>('SELECT uuid FROM scan LIMIT 1')!;
  await act(async () => { tree.root.findAll(node => node.type === BottomNav)[0].props.onSelect('monitoring'); });
  const list = tree.root.findAll(node => node.type === MonitoringListScreen)[0];
  await act(async () => { list.props.onOpen(source.uuid); });
}

jest.mock('../../features/capture/CameraCapture', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    CameraCapture: ({ onCaptured }: { onCaptured: (uri: string) => Promise<void> }) =>
      React.createElement(Pressable, { accessibilityLabel: 'Test shutter', onPress: () => onCaptured('file:///camera.jpg') },
        React.createElement(Text, null, 'Test shutter')),
  };
});

test('reachable Monitoring opens a persisted Day 1/5/10 timeline for the selected scan', async () => {
  const db = seedStoredScans();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AppNavigator db={db} />); });
  await openMonitoring(tree, db);

  const text = textOf(tree.root);
  expect(text).toContain('Day 1');
  expect(text).toContain('Day 5');
  expect(text).toContain('Day 10');
  expect(db.all('SELECT id FROM monitoring_session')).toHaveLength(1);
});

test('checkpoint capture returns its owned photo to the same draft and saves the scoped row', async () => {
  const db = seedStoredScans();
  jest.spyOn(ExpoPhotoStore.prototype, 'copyToOwned').mockResolvedValue('file:///owned/checkpoint.jpg');
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AppNavigator db={db} />); });
  await openMonitoring(tree, db);
  act(() => { findPressable(tree, 'Complete checkpoint').props.onPress(); });
  act(() => { findPressable(tree, 'Better').props.onPress(); });
  const note = tree.root.findAll(node => node.props.accessibilityLabel === 'Optional note' && typeof node.props.onChangeText === 'function')[0];
  act(() => { note.props.onChangeText('Leaves look better'); });
  act(() => { findPressable(tree, 'Add photo').props.onPress(); });
  await act(async () => { await findPressable(tree, 'Test shutter').props.onPress(); });

  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Optional note' && node.props.value === 'Leaves look better')).not.toHaveLength(0);
  expect(textOf(tree.root)).toContain('Replace photo');
  act(() => { tree.root.findAll(node => node.type === BottomNav)[0].props.onScan(); });
  expect(textOf(tree.root)).toContain('Discard this observation?');
  act(() => { findPressable(tree, 'Keep editing').props.onPress(); });
  expect(textOf(tree.root)).toContain('Replace photo');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'Optional note' && node.props.value === 'Leaves look better')).not.toHaveLength(0);
  await act(async () => { await findPressable(tree, 'Save observation').props.onPress(); });
  expect(db.all<{ observation: string; note: string; photo_uri: string }>(
    'SELECT observation, note, photo_uri FROM monitoring_checkpoint WHERE observation IS NOT NULL',
  )).toEqual([{ observation: 'better', note: 'Leaves look better', photo_uri: 'file:///owned/checkpoint.jpg' }]);
  jest.restoreAllMocks();
});

test('app-bar and hardware Back keep a dirty checkpoint draft until discard is confirmed', async () => {
  const db = seedStoredScans();
  let hardwareBack: (() => boolean | null | undefined) | undefined;
  const listener = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, callback) => {
    hardwareBack = callback;
    return { remove: jest.fn() } as never;
  });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AppNavigator db={db} />); });
  await openMonitoring(tree, db);
  act(() => { findPressable(tree, 'Complete checkpoint').props.onPress(); });
  act(() => { findPressable(tree, 'Better').props.onPress(); });
  act(() => { findPressable(tree, 'Go back').props.onPress(); });
  expect(textOf(tree.root)).toContain('Discard this observation?');
  expect(textOf(tree.root)).toContain('Day 10');
  act(() => { findPressable(tree, 'Keep editing').props.onPress(); });
  let handled: boolean | null | undefined;
  act(() => { handled = hardwareBack?.(); });
  expect(handled).toBe(true);
  expect(textOf(tree.root)).toContain('Discard this observation?');
  await act(async () => { await findPressable(tree, 'Discard draft').props.onPress(); });
  expect(textOf(tree.root)).not.toContain('Discard this observation?');
  expect(tree.root.findAll(node => node.type === MonitoringScreen)).toHaveLength(0);
  expect(tree.root.findAll(node => node.type === MonitoringListScreen)).toHaveLength(1);
  listener.mockRestore();
});

test.each(['home', 'account', 'scan'] as const)('dirty checkpoint guards %s navigation and resumes only after discard', async destination => {
  const db = seedStoredScans();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AppNavigator db={db} />); });
  await openMonitoring(tree, db);
  act(() => { findPressable(tree, 'Complete checkpoint').props.onPress(); });
  act(() => { findPressable(tree, 'Better').props.onPress(); });
  const navigate = () => {
    const nav = tree.root.findAll(node => node.type === BottomNav)[0];
    if (destination === 'scan') nav.props.onScan();
    else nav.props.onSelect(destination);
  };
  act(navigate);
  expect(textOf(tree.root)).toContain('Discard this observation?');
  expect(tree.root.findAll(node => node.type === CameraCapture)).toHaveLength(0);
  act(() => { findPressable(tree, 'Keep editing').props.onPress(); });
  expect(textOf(tree.root)).not.toContain('Discard this observation?');
  expect(textOf(tree.root)).toContain('Better');
  act(navigate);
  await act(async () => { await findPressable(tree, 'Discard draft').props.onPress(); });
  if (destination === 'scan') {
    expect(tree.root.findAll(node => node.type === CameraCapture)).toHaveLength(1);
    expect(tree.root.findAll(node => node.type === BottomNav)).toHaveLength(0);
  } else {
    expect(tree.root.findAll(node => node.type === BottomNav)[0].props.active).toBe(destination);
  }
  act(() => tree.unmount());
});

test('Back from a new observation session refreshes the persisted monitoring list', async () => {
  const db = seedStoredScans();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AppNavigator db={db} />); });
  await openMonitoring(tree, db);
  await act(async () => { findPressable(tree, 'Go back').props.onPress(); });
  expect(tree.root.findAll(node => node.type === MonitoringListScreen)[0].props.rows).toHaveLength(1);
  act(() => tree.unmount());
});
