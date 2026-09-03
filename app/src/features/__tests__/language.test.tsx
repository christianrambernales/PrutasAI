/**
 * Language switching, end to end.
 *
 * The EN/FIL control used to move and change nothing: `app.language` reached
 * only the chat while every screen was hardcoded English. These tests assert
 * the visible UI actually changes.
 */

import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import {
  resetAppDatabase, seedConsent, seedLanguagePicked, seedStoredScans, seedSyncMode,
} from '../../testing/appDatabase';
import { press, textOf } from '../../testing/interaction';
import { strings } from '../../ui/i18n/strings';

beforeEach(() => {
  resetAppDatabase();
  seedLanguagePicked();
  seedConsent();
  seedSyncMode();
});

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<AppNavigator />);
  });
  return tree;
}

function screenText(tree: ReactTestRenderer): string {
  return textOf(tree.root);
}

function switchToFilipino(tree: ReactTestRenderer) {
  press(tree, 'Settings');
  press(tree, 'FIL');
  press(tree, 'Go back');
}

test('the dictionaries cover exactly the same keys', () => {
  const en = Object.keys(strings('EN')).sort();
  const fil = Object.keys(strings('FIL')).sort();
  expect(fil).toEqual(en);
});

test('no Filipino string was left as its English original', () => {
  const en = strings('EN');
  const fil = strings('FIL');
  const untranslated = Object.keys(en).filter(key => {
    const a = (en as Record<string, unknown>)[key];
    const b = (fil as Record<string, unknown>)[key];
    return typeof a === 'string' && typeof b === 'string' && a === b;
  });

  // A handful are legitimately identical — loanwords a Filipino farmer uses in
  // English anyway, where a coined Tagalog term would read as stilted.
  expect(untranslated.sort()).toEqual(['emailLabel', 'knowledgeBase', 'passwordLabel', 'tabHome', 'titleScan']);
});

test('switching to Filipino changes the home screen', () => {
  const tree = render();
  const before = screenText(tree);

  switchToFilipino(tree);
  const after = screenText(tree);

  expect(after).not.toBe(before);
  expect(after).toContain('Buksan ang kamera');
  expect(after).not.toContain('Open camera');
});

test('switching to Filipino changes the bottom navigation', () => {
  const tree = render();
  expect(screenText(tree)).toContain('Climate');

  switchToFilipino(tree);
  expect(screenText(tree)).toContain('Panahon');
});

test('the language survives navigating to another tab', () => {
  const tree = render();
  switchToFilipino(tree);

  press(tree, 'Panahon');
  expect(screenText(tree)).toContain('Walang nakatakdang lokasyon');
});

test('the home language chip reports the active language', () => {
  const tree = render();
  expect(screenText(tree)).toContain('EN');

  switchToFilipino(tree);
  expect(screenText(tree)).toContain('FIL');
});

test('the chip toggles the language on its own', () => {
  const tree = render();
  press(tree, 'Change language');
  expect(screenText(tree)).toContain('Buksan ang kamera');

  press(tree, 'Palitan ang wika');
  expect(screenText(tree)).toContain('Open camera');
});

test('a translated history filter still selects the same scans', () => {
  seedStoredScans();
  const tree = render();
  switchToFilipino(tree);
  press(tree, 'Kasaysayan');
  expect(screenText(tree)).toContain('Banana · Lakatan');

  // The label is Filipino; the key behind it is still "Diseased", so it selects
  // the same scans it would in English — here, none of them.
  press(tree, 'May sakit');
  expect(screenText(tree)).not.toContain('Banana · Lakatan');
});

test('the assistant answers in Filipino once the language is switched', () => {
  const tree = render();
  switchToFilipino(tree);
  press(tree, 'Usapan');

  press(tree, 'Anong mga uri ng saging?');
  const content = screenText(tree);
  expect(content).toContain('Lakatan');
  expect(content).toContain('kayang tukuyin ng modelo');
});
