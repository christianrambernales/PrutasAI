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

let currentTree: ReactTestRenderer | null = null;

afterEach(async () => {
  if (currentTree) {
    act(() => {
      currentTree?.unmount();
    });
    currentTree = null;
  }
  await act(async () => {
    await Promise.resolve();
  });
});

function render(): ReactTestRenderer {
  act(() => {
    currentTree = renderer.create(<AppNavigator />);
  });
  return currentTree!;
}

function screenText(tree: ReactTestRenderer): string {
  return textOf(tree.root);
}

function switchToFilipino(tree: ReactTestRenderer) {
  press(tree, 'Settings');
  press(tree, strings('EN').languageFilipino);
  press(tree, strings('FIL').goBack);
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
  expect(untranslated.sort()).toEqual([
    'assistantBotName',
    'brandName',
    'emailAddressLabel',
    'emailLabel',
    'englishLanguageName',
    'filipinoLanguageName',
    'fruitPapaya',
    'knowledgeBase',
    'languageFilipino',
    'passwordLabel',
    'pipelineStage1Title',
    'pipelineStage2Sub',
    'pipelineStage2Title',
    'pipelineStage3Sub',
    'pipelineStage3Title',
    'tabHome',
    'titleScan',
  ]);
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
  expect(screenText(tree)).toContain('Assistant');

  switchToFilipino(tree);
  expect(screenText(tree)).toContain('Katuwang');
});

test('the language survives navigating to another tab', () => {
  const tree = render();
  switchToFilipino(tree);

  press(tree, 'Katuwang');
  expect(screenText(tree)).toContain('Katuwang sa Pananim');
});

test('the settings language control reports the active language', () => {
  const tree = render();
  press(tree, 'Settings');
  expect(screenText(tree)).toContain('English');

  press(tree, strings('EN').languageFilipino);
  expect(screenText(tree)).toContain('Filipino');
  press(tree, strings('FIL').goBack);
});

test('changing language toggles the app copy end to end', () => {
  const tree = render();
  switchToFilipino(tree);
  expect(screenText(tree)).toContain('Buksan ang kamera');

  press(tree, strings('FIL').settings);
  press(tree, strings('FIL').languageEnglish);
  press(tree, strings('EN').goBack);
  expect(screenText(tree)).toContain('Open camera');
});

test('a translated history filter still selects the same scans', () => {
  seedStoredScans();
  const tree = render();
  switchToFilipino(tree);
  press(tree, 'Kasaysayan');
  expect(screenText(tree)).toContain('Saging · Lakatan');

  // The label is Filipino; the key behind it is still "Diseased", so it selects
  // the same scans it would in English — here, none of them.
  press(tree, 'May sakit');
  expect(screenText(tree)).not.toContain('Saging · Lakatan');
});

test('the assistant answers in Filipino once the language is switched', () => {
  const tree = render();
  switchToFilipino(tree);
  press(tree, strings('FIL').tabAssistant);

  press(tree, 'Anong mga uri ng saging?');
  const content = screenText(tree);
  expect(content).toContain('Lakatan');
  expect(content).toContain('kayang tukuyin ng modelo');
});
