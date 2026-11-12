import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TabBar, TabBody, tabItems } from '../render/tabs';
import type { TabKey } from '../navState';
import { HomeScreen } from '../../features/home/HomeScreen';
import { MonitoringListScreen } from '../../features/monitoring/MonitoringListScreen';
import { findPressable, textOf } from '../../testing/interaction';
import { makeShell } from '../../testing/shellFixture';
import { RouteBar, RouteBody, routeTitle } from '../render/routes';
import { activeNavKey } from '../AppNavigator';
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
  expect(render('home')).toContain('Crop Profiles & Guidance');
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
  expect(tree).toContain('Take or Choose Photo');
  expect(tree).toContain('View History');
  expect(tree).toContain('Mangga Carabao #042');
  expect(tree).toContain('Carabao Mango');
});

test('onOpenChat routes to the blank chat tab', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.selectTab = jest.fn();
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  const home = tree.root.findAll(node => node.type === HomeScreen)[0];
  act(() => { home.props.onOpenChat?.(); });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('chat');
});

test('onOpenMonitoring routes to the persisted monitoring list', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.selectTab = jest.fn();
  shell.data.allScans = [{ id: 'scan-1', emoji: '🍌', title: 'Banana', status: 'healthy', detail: 'test', timeLabel: 'Now' }];
  
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  act(() => { findPressable(tree, 'Mangga Carabao #042').props.onPress(); });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('monitoring');
});

test('onOpenMonitoring shows the list even when no scans exist', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.selectTab = jest.fn();
  shell.data.allScans = [];
  
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  act(() => { findPressable(tree, 'Mangga Carabao #042').props.onPress(); });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('monitoring');
});

test('fresh truthful result adapters browse crop knowledge and start monitoring', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.push = jest.fn();
  shell.nav.selectTab = jest.fn();
  act(() => {
    tree = renderer.create(
      <RouteBody shell={shell} route={{ name: 'captureResult', scanId: 'scan-1', photoUri: 'file:///owned/photo.jpg', view: 'summary' }} />,
    );
  });

  act(() => {
    findPressable(tree, 'Browse Local Crop Knowledge').props.onPress();
    findPressable(tree, 'Start Manual Monitoring Session').props.onPress();
  });
  expect(shell.nav.push).toHaveBeenCalledWith({
    name: 'varietyInfo', fruitKey: 'mango',
  });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('monitoring');
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

test('stored scan guidance uses the known fruit and monitoring routes to monitoring tab', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.push = jest.fn();
  shell.nav.selectTab = jest.fn();
  insertScan(shell.data.db, {
    uuid: 'scan-1', imageUri: 'file:///owned/mango.jpg', createdAt: '2026-09-22T09:15:00.000Z',
    fruitKey: 'mango', fruitConf: null, varietyKey: null, varietyConf: null,
    bboxJson: null, manifestVersion: null, lat: null, lon: null, isOwnedPhoto: true,
  });
  act(() => {
    tree = renderer.create(<RouteBody shell={shell} route={{ name: 'result', scanId: 'scan-1' }} />);
  });

  act(() => {
    findPressable(tree, 'Browse Local Crop Knowledge').props.onPress();
  });
  expect(shell.nav.push).toHaveBeenCalledWith({ name: 'varietyInfo', fruitKey: 'mango' });

  act(() => {
    findPressable(tree, 'Start Manual Monitoring Session').props.onPress();
  });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('monitoring');
});

test('captureResult route wires Retake and Demo Test button to ResultScreen', () => {
  const shell = makeShell();
  shell.nav.push = jest.fn();
  shell.nav.replace = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <RouteBody
        shell={shell}
        route={{ name: 'captureResult', scanId: 'scan-1', photoUri: 'file:///owned/photo.jpg', view: 'summary' }}
      />,
    );
  });

  act(() => {
    findPressable(tree, 'Retake').props.onPress();
    findPressable(tree, '[Demo Test] View Illustrative Sample Screen').props.onPress();
  });

  expect(shell.nav.replace).toHaveBeenCalledWith({ name: 'capture' });
  expect(shell.nav.push).toHaveBeenCalledWith({ name: 'result', scanId: 'demo-sample' });
});

test('result route with demo-sample renders ResultScreen', () => {
  const text = renderRoute({ name: 'result', scanId: 'demo-sample' });
  expect(text).toContain('Illustrative Sample Scenario');
  expect(text).toContain('Anthracnose');
  expect(text).toContain('28.5% • KATAMTAMAN (MODERATE)');
});

test('TabBar and RouteBar return null so no stacked legacy AppBar renders', () => {
  const shell = makeShell();
  for (const tab of ['home', 'monitoring', 'chat', 'account'] as const) {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TabBar shell={shell} tab={tab} />);
    });
    expect(tree.toJSON()).toBeNull();
  }
  for (const route of [
    { name: 'history' as const },
    { name: 'climate' as const },
    { name: 'settings' as const },
    { name: 'account' as const },
    { name: 'monitoring' as const, sessionId: 'scan-1' },
  ]) {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<RouteBar shell={shell} route={route} />);
    });
    expect(tree.toJSON()).toBeNull();
  }
});

test('activeNavKey maps active routes to BottomNav keys', () => {
  expect(activeNavKey('home', null)).toBe('home');
  expect(activeNavKey('chat', null)).toBe('chat');
  expect(activeNavKey('home', { name: 'capture' })).toBe('scan');
  expect(activeNavKey('home', { name: 'captureResult', scanId: 's1', photoUri: 'file:///a.jpg', view: 'summary' })).toBe('scan');
  expect(activeNavKey('home', { name: 'result', scanId: 's1' })).toBe('scan');
  expect(activeNavKey('home', { name: 'monitoring', sessionId: 's1' })).toBe('monitoring');
  expect(activeNavKey('home', { name: 'account' })).toBe('account');
  expect(activeNavKey('home', { name: 'login' })).toBe('account');
  expect(activeNavKey('home', { name: 'signup' })).toBe('account');
  expect(activeNavKey('home', { name: 'forgotPassword' })).toBe('account');
  expect(activeNavKey('home', { name: 'resetPassword' })).toBe('account');
  expect(activeNavKey('home', { name: 'modelStatus' })).toBe('account');
  expect(activeNavKey('home', { name: 'trash' })).toBe('account');
  expect(activeNavKey('home', { name: 'settings' })).toBe('account');
  expect(activeNavKey('account', { name: 'history' })).toBe('home');
  expect(activeNavKey('account', { name: 'climate' })).toBe('home');
  expect(activeNavKey('account', { name: 'locationPicker' })).toBe('home');
  expect(activeNavKey('account', { name: 'varietyInfo', fruitKey: 'mango' })).toBe('home');
});
