import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TabBody, tabItems } from '../render/tabs';
import type { TabKey } from '../navState';
import { HomeScreen } from '../../features/home/HomeScreen';
import { MonitoringListScreen } from '../../features/monitoring/MonitoringListScreen';
import { findPressable, textOf } from '../../testing/interaction';
import { makeShell } from '../../testing/shellFixture';
import { RouteBody, routeTitle } from '../render/routes';
import { strings } from '../../ui/i18n/strings';
import { insertScan } from '../../core/db/repositories/scans';

function renderRoute(route: Parameters<typeof RouteBody>[0]['route']) {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<RouteBody shell={makeShell()} route={route} />); });
  return textOf(tree.root);
}

function render(tab: TabKey) {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<TabBody shell={makeShell()} tab={tab} />); });
  return textOf(tree.root);
}

test.each(['EN', 'FIL'] as const)('bottom tabs use the approved order and translated labels in %s', language => {
  const t = strings(language);
  expect(tabItems(t).map(item => item.key)).toEqual(['home', 'monitoring', 'chat', 'account']);
  expect(tabItems(t).map(item => item.label)).toEqual([t.tabHome, t.tabMonitoring, t.tabAssistant, t.tabAccount]);
});

test('Home opens History and Climate as detail destinations', () => {
  const shell = makeShell();
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  const home = tree.root.findAll(node => node.type === HomeScreen)[0];
  act(() => { home.props.onOpenClimate(); home.props.onViewAllScans(); });
  expect(shell.nav.push).toHaveBeenNthCalledWith(1, { name: 'climate' });
  expect(shell.nav.push).toHaveBeenNthCalledWith(2, { name: 'history' });
});

test('Monitoring selection passes source scan ID to its detail controller', () => {
  const shell = makeShell();
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="monitoring" />); });
  act(() => { tree.root.findAll(node => node.type === MonitoringListScreen)[0].props.onOpen('source-scan'); });
  expect(shell.nav.push).toHaveBeenCalledWith({ name: 'monitoring', sessionId: 'source-scan' });
});
test('account, login, and forgotPassword render their dedicated real auth forms', () => {
  expect(renderRoute({ name: 'account' })).toContain('Log In');
  expect(renderRoute({ name: 'login' })).toContain('Log In');
  expect(renderRoute({ name: 'forgotPassword' })).toContain('Reset password');
});

test('the home tab renders without mounting the navigator', () => {
  expect(render('home')).toContain('Browse fruits');
});

test('the history route renders the empty state when nothing is stored', () => {
  expect(renderRoute({ name: 'history' })).toContain('No scans match');
});

test('the chat tab renders the curated-wording banner', () => {
  expect(render('chat')).toContain('knowledge base');
});

test('a route title names the fruit for a variety-info route', () => {
  const t = strings('EN');
  const fruits = [{
    key: 'mango', nameEn: 'Mango', nameFil: 'Mangga', emoji: '🥭',
    varietyCount: 3, scanCount: 0,
  }];
  expect(routeTitle({ name: 'varietyInfo', fruitKey: 'mango' }, t, fruits as never))
    .toContain('Mango');
  expect(routeTitle({ name: 'varietyInfo', fruitKey: 'mango' }, strings('FIL'), fruits as never, 'FIL'))
    .toBe('Mangga');
});

test('the settings route renders without mounting the navigator', () => {
  expect(renderRoute({ name: 'settings' })).toContain('AI assistant');
});

test('the trash route renders its empty state', () => {
  expect(renderRoute({ name: 'trash' })).toContain('Trash is empty');
});

test('Home screen renders all prominent actions', () => {
  const tree = render('home');
  expect(tree).toContain('Scan a fruit');
  expect(tree).toContain('History');
  expect(tree).toContain('Assistant');
  expect(tree).toContain('Monitoring');
});

test('onOpenChat routes to the blank chat tab', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.selectTab = jest.fn();
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  const chatBtn = tree.root.findAll(node => node.props.accessibilityLabel === 'Assistant')[0];
  act(() => { chatBtn.props.onPress(); });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('chat');
});

test('onOpenMonitoring routes to the persisted monitoring list', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.push = jest.fn();
  shell.data.allScans = [{ id: 'scan-1', emoji: '🍌', title: 'Banana', status: 'healthy', detail: 'test', timeLabel: 'Now' }];
  
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  const monitorBtn = tree.root.findAll(node => node.props.accessibilityLabel === 'Monitoring')[0];
  act(() => { monitorBtn.props.onPress(); });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('monitoring');
});

test('onOpenMonitoring shows the list even when no scans exist', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.selectTab = jest.fn();
  shell.data.allScans = [];
  
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  const monitorBtn = tree.root.findAll(node => node.props.accessibilityLabel === 'Monitoring')[0];
  act(() => { monitorBtn.props.onPress(); });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('monitoring');
});

test('fresh truthful result adapters review the local photo and browse Home guidance', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.replace = jest.fn();
  shell.nav.selectTab = jest.fn();
  act(() => {
    tree = renderer.create(
      <RouteBody shell={shell} route={{ name: 'captureResult', scanId: 'scan-1', photoUri: 'file:///owned/photo.jpg', view: 'summary' }} />,
    );
  });

  act(() => {
    findPressable(tree, 'Review local photo').props.onPress();
    findPressable(tree, 'Browse local guidance').props.onPress();
  });
  expect(shell.nav.replace).toHaveBeenCalledWith({
    name: 'captureResult', scanId: 'scan-1', photoUri: 'file:///owned/photo.jpg', view: 'photo',
  });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('home');
});

test('photo-review Back restores the result summary for the same stable scan', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.replace = jest.fn();
  act(() => {
    tree = renderer.create(
      <RouteBody shell={shell} route={{ name: 'captureResult', scanId: 'scan-1', photoUri: 'file:///owned/photo.jpg', view: 'photo' }} />,
    );
  });

  act(() => {
    findPressable(tree, 'Back to summary').props.onPress();
  });
  expect(shell.nav.replace).toHaveBeenCalledWith({
    name: 'captureResult', scanId: 'scan-1', photoUri: 'file:///owned/photo.jpg', view: 'summary',
  });
});

test('stored scan guidance uses the known fruit and monitoring receives its stable scan ID', async () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.push = jest.fn();
  insertScan(shell.data.db, {
    uuid: 'scan-1', imageUri: 'file:///owned/mango.jpg', createdAt: '2026-09-22T09:15:00.000Z',
    fruitKey: 'mango', fruitConf: null, varietyKey: null, varietyConf: null,
    bboxJson: null, manifestVersion: null, lat: null, lon: null, isOwnedPhoto: true,
  });
  act(() => {
    tree = renderer.create(<RouteBody shell={shell} route={{ name: 'result', scanId: 'scan-1' }} />);
  });

  act(() => {
    findPressable(tree, 'Browse local guidance').props.onPress();
  });
  expect(shell.nav.push).toHaveBeenCalledWith({ name: 'varietyInfo', fruitKey: 'mango' });

  await act(async () => {
    await findPressable(tree, 'Start observation monitoring').props.onPress();
  });
  expect(shell.nav.push).toHaveBeenLastCalledWith(expect.objectContaining({
    name: 'monitoring',
  }));
});
