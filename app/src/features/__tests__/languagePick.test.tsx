import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { getSetting } from '../../core/db/repositories/settings';
import { resetAppDatabase, seedConsent } from '../../testing/appDatabase';
import { press, textOf } from '../../testing/interaction';
import type { SqlDriver } from '../../core/db/driver';

let db: SqlDriver;

beforeEach(() => {
  db = resetAppDatabase();
});

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<AppNavigator />); });
  return tree;
}

test('a fresh install sees the language choice before Welcome', () => {
  const content = textOf(render().root);
  expect(content).toContain('Choose your language');
  expect(content).toContain('Piliin ang iyong wika');
  expect(content).not.toContain('Sign in or create an account');
});

test('picking a language persists it and continues on to Welcome', () => {
  const tree = render();
  press(tree, 'Filipino');

  expect(getSetting(db, 'app_language_picked')).toBe('1');
  const content = textOf(tree.root);
  expect(content).toContain('Gamitin nang offline');
});

test('it is not shown again on the next launch', () => {
  const first = render();
  press(first, 'English');

  const second = render();
  expect(textOf(second.root)).not.toContain('Choose your language');
});

test('an install that already consented under the old flow still sees the language choice once', () => {
  // Existing installs predate this screen, so app_language_picked is unset
  // for them too — the same situation Welcome itself already handles.
  seedConsent();
  const content = textOf(render().root);
  expect(content).toContain('Choose your language');
});
