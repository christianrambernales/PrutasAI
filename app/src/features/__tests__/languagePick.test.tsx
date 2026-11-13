import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { getSetting } from '../../core/db/repositories/settings';
import { resetAppDatabase, seedConsent } from '../../testing/appDatabase';
import { press, textOf } from '../../testing/interaction';
import type { SqlDriver } from '../../core/db/driver';

let db: SqlDriver;
let renderedTrees: ReactTestRenderer[] = [];

afterEach(async () => {
  for (const tree of renderedTrees) {
    act(() => {
      tree.unmount();
    });
  }
  renderedTrees = [];
  await act(async () => {
    await Promise.resolve();
  });
});

beforeEach(() => {
  db = resetAppDatabase();
});

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<AppNavigator />);
  });
  renderedTrees.push(tree);
  return tree;
}

test('a fresh install sees the unified Welcome screen with bilingual language toggle', () => {
  const content = textOf(render().root);
  expect(content).toContain('Maligayang Pagdating sa PrutasAI');
  expect(content).toContain('FIL');
  expect(content).toContain('EN');
  expect(content).toContain('Continue Fully Offline (Recommended)');
});

test('picking Filipino updates the Welcome options, persists language, and advances to Home', () => {
  const tree = render();
  press(tree, 'Filipino language');
  expect(textOf(tree.root)).toContain('Magpatuloy nang Ganap na Offline (Rekomendado)');

  press(tree, 'Magpatuloy nang Ganap na Offline (Rekomendado)');

  expect(getSetting(db, 'app_language_picked')).toBe('1');
  expect(getSetting(db, 'app_language')).toBe('FIL');
  expect(textOf(tree.root)).toContain('Magandang araw!');
});

test('it is not shown again on the next launch', () => {
  const first = render();
  press(first, 'English language');
  press(first, 'Continue Fully Offline (Recommended)');

  const second = render();
  expect(textOf(second.root)).not.toContain('Maligayang Pagdating sa PrutasAI');
  expect(textOf(second.root)).toContain('Take or Choose Photo');
});

test('an install that consented under an older flow without language pick still sees Welcome once', () => {
  seedConsent();
  const content = textOf(render().root);
  expect(content).toContain('Maligayang Pagdating sa PrutasAI');
});
