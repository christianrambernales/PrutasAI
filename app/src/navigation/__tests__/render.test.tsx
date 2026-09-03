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
