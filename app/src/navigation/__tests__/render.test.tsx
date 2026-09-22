import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TabBody } from '../render/tabs';
import { textOf } from '../../testing/interaction';
import { makeShell } from '../../testing/shellFixture';
import { RouteBody, routeTitle } from '../render/routes';
import { strings } from '../../ui/i18n/strings';

function renderRoute(route: Parameters<typeof RouteBody>[0]['route']) {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<RouteBody shell={makeShell()} route={route} />); });
  return textOf(tree.root);
}

function render(tab: 'home' | 'climate' | 'chat' | 'history') {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<TabBody shell={makeShell()} tab={tab} />); });
  return textOf(tree.root);
}

test('the home tab renders without mounting the navigator', () => {
  expect(render('home')).toContain('Browse fruits');
});

test('the history tab renders the empty state when nothing is stored', () => {
  expect(render('history')).toContain('No scans match');
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
  expect(tree).toContain('Assistant Chat');
  expect(tree).toContain('Monitoring');
});

test('onOpenChat routes to the blank chat tab', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.selectTab = jest.fn();
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  const chatBtn = tree.root.findAll(node => node.props.accessibilityLabel === 'Assistant Chat')[0];
  act(() => { chatBtn.props.onPress(); });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('chat');
});

test('onOpenMonitoring routes to latest scan monitoring session', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.push = jest.fn();
  shell.data.allScans = [{ id: 'scan-1', emoji: '🍌', title: 'Banana', status: 'healthy', detail: 'test', timeLabel: 'Now' }];
  
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  const monitorBtn = tree.root.findAll(node => node.props.accessibilityLabel === 'Monitoring')[0];
  act(() => { monitorBtn.props.onPress(); });
  expect(shell.nav.push).toHaveBeenCalledWith({ name: 'monitoring', sessionId: 'scan-1' });
});

test('onOpenMonitoring falls back to history when no scans exist', () => {
  let tree!: ReactTestRenderer;
  const shell = makeShell();
  shell.nav.selectTab = jest.fn();
  shell.data.allScans = [];
  
  act(() => { tree = renderer.create(<TabBody shell={shell} tab="home" />); });
  
  const monitorBtn = tree.root.findAll(node => node.props.accessibilityLabel === 'Monitoring')[0];
  act(() => { monitorBtn.props.onPress(); });
  expect(shell.nav.selectTab).toHaveBeenCalledWith('history');
});
