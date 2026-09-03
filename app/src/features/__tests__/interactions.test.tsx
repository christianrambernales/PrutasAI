/**
 * What the controls *do*, as opposed to what they say.
 *
 * The screen suite next door asserts rendered text. That suite passed 68/68
 * while a dozen controls were wired to `() => {}`, so these tests press things
 * and assert the app changed.
 */

import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { ConversationSidebar } from '../chat/ConversationSidebar';
import {
  resetAppDatabase, seedConsent, seedLanguagePicked, seedStoredScans, seedSyncMode,
} from '../../testing/appDatabase';
import {
  findPressable, press, pressableRoles, pressAsync, textOf, typeInto,
} from '../../testing/interaction';

// History comes from the device database now, so each test starts from an
// empty one and states for itself what is stored.
beforeEach(() => {
  resetAppDatabase();
  seedLanguagePicked();
  seedConsent();
  seedSyncMode();
});

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

function screenText(tree: ReactTestRenderer): string {
  return textOf(tree.root);
}

// --- the systemic guard -----------------------------------------------------

test.each(['Home', 'Climate', 'Chat', 'History'])(
  'every control on the %s tab has a press handler',
  tab => {
    const tree = render(<AppNavigator />);
    press(tree, tab);

    const dead = pressableRoles(tree).filter(n => typeof n.props.onPress !== 'function');
    expect(
      dead.map(n => n.props.accessibilityLabel ?? textOf(n) ?? '(unlabelled)'),
    ).toEqual([]);
  },
);

test('every control has an accessibility label or visible text', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Climate');

  const unnamed = pressableRoles(tree).filter(
    n => !n.props.accessibilityLabel && textOf(n).trim() === '',
  );
  expect(unnamed).toHaveLength(0);
});

// --- chat -------------------------------------------------------------------

test('typing a question and sending it adds the question to the transcript', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Chat');

  typeInto(tree, 'Ask about', 'What varieties of mango are there?');
  press(tree, 'Send');

  expect(screenText(tree)).toContain('What varieties of mango are there?');
});

test('sending a question produces an answer', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Chat');

  const before = screenText(tree);
  typeInto(tree, 'Ask about', 'What varieties of mango are there?');
  press(tree, 'Send');
  const after = screenText(tree);

  // Two new bubbles: the question and a reply naming the model's mango classes.
  expect(after.length).toBeGreaterThan(before.length);
  expect(after).toContain('Carabao');
});

test('sending clears the input so the question is not sent twice', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Chat');

  typeInto(tree, 'Ask about', 'What varieties of mango are there?');
  press(tree, 'Send');

  const field = tree.root.findAll(
    n => n.props != null && typeof n.props.onChangeText === 'function',
    { deep: true },
  )[0];
  expect(field.props.value).toBe('');
});

test('an empty message is not sent', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Chat');

  const before = screenText(tree);
  typeInto(tree, 'Ask about', '   ');
  press(tree, 'Send');

  expect(screenText(tree)).toBe(before);
});

test('tapping a suggestion asks it', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Chat');

  const suggestion = 'Anthracnose remedy';
  press(tree, suggestion);

  // The suggestion becomes a user turn, so it now appears twice: chip + bubble.
  const occurrences = screenText(tree).split(suggestion).length - 1;
  expect(occurrences).toBeGreaterThan(1);
});

// --- conversation sidebar ----------------------------------------------------

test('the menu icon opens the sidebar showing the conversation just started', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Chat');

  // A fresh conversation is only a row in the database once its first
  // message is sent — this is what proves the sidebar's list keeps up with
  // that without an app restart, not just that it opens.
  const question = 'What varieties of mango are there?';
  typeInto(tree, 'Ask about', question);
  press(tree, 'Send');

  // Already once, from the sent bubble in the transcript.
  const beforeMenu = screenText(tree).split(question).length - 1;
  press(tree, 'menu');
  const afterMenu = screenText(tree).split(question).length - 1;

  // A second occurrence, from the sidebar row titled after that question.
  expect(afterMenu).toBeGreaterThan(beforeMenu);
});

/**
 * `persist()` bumps `conversation.updated_at` on every message and the sidebar
 * sorts on that column, but sending into the conversation already on screen
 * changes neither the conversation id nor dataVersion. Without the message
 * count in the memo's dependencies the list is never re-queried, so the order
 * is right in the database and stale on screen until the app restarts.
 */
test('a reply in an older conversation moves it back to the top of the sidebar', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Chat');

  const older = 'What varieties of mango are there?';
  typeInto(tree, 'Ask about', older);
  press(tree, 'Send');

  press(tree, 'menu');
  press(tree, 'New conversation');
  typeInto(tree, 'Ask about', 'What varieties of banana are there?');
  press(tree, 'Send');

  const titles = () =>
    tree.root
      .findAllByType(ConversationSidebar)[0]
      .props.conversations.map((c: { title: string }) => c.title);

  expect(titles()[0]).toContain('banana');

  // Reopen the older conversation and add a turn to it.
  press(tree, 'menu');
  press(tree, older);
  typeInto(tree, 'Ask about', 'What varieties of papaya are there?');
  press(tree, 'Send');

  expect(titles()[0]).toContain('mango');
});

// --- settings ---------------------------------------------------------------

test('the location toggle flips when pressed', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Settings');

  const before = findPressable(tree, 'Use my location').props.accessibilityState?.checked;
  press(tree, 'Use my location');
  const after = findPressable(tree, 'Use my location').props.accessibilityState?.checked;

  expect(after).toBe(!before);
});

test('switching the language to Filipino selects it', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Settings');

  press(tree, 'FIL');

  expect(findPressable(tree, 'FIL').props.accessibilityState?.selected).toBe(true);
});

test('the AI assistant toggle flips when pressed', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Settings');

  const before = findPressable(tree, 'AI assistant').props.accessibilityState?.checked;
  press(tree, 'AI assistant');
  const after = findPressable(tree, 'AI assistant').props.accessibilityState?.checked;

  expect(after).toBe(!before);
});

// --- history ----------------------------------------------------------------

test('choosing a history filter selects it', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'History');

  press(tree, 'Diseased');

  expect(findPressable(tree, 'Diseased').props.accessibilityState?.selected).toBe(true);
});

test('a history filter narrows the list', () => {
  seedStoredScans();
  const tree = render(<AppNavigator />);
  press(tree, 'History');

  const before = screenText(tree);
  expect(before).toContain('Banana · Lakatan');

  press(tree, 'Diseased');
  const after = screenText(tree);

  expect(after).not.toBe(before);
  // No disease model has ever run, so nothing on file is diseased and the
  // filter empties the list rather than quietly leaving it unchanged.
  expect(after).not.toContain('Banana · Lakatan');
  expect(after).toContain('No scans match');
});

// --- capture and results ----------------------------------------------------

test('capturing does not fabricate a diagnosis while no model is installed', async () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Scan a fruit');
  await pressAsync(tree, 'Take photo');

  const content = screenText(tree);
  expect(content).toContain('Detection model not installed');
  // The preview verdict must never reach a screen that claims a detection.
  expect(content).not.toContain('Anthracnose');
  expect(content).not.toContain('0.96');
  expect(content).not.toContain('Recommended remedy');
});

test('opening two different scans shows two different results', () => {
  seedStoredScans();
  const tree = render(<AppNavigator />);

  press(tree, 'Banana · Lakatan');
  const first = screenText(tree);
  press(tree, 'Go back');

  press(tree, 'Mango · Carabao');
  const second = screenText(tree);

  expect(second).not.toBe(first);
  expect(first).toContain('Banana · Lakatan');
  expect(second).toContain('Mango · Carabao');
});

test('opening a stored scan reports what was stored and nothing more', () => {
  seedStoredScans();
  const tree = render(<AppNavigator />);

  press(tree, 'Banana · Lakatan');
  const content = screenText(tree);

  // The same honest state a fresh capture shows: the row carries a photo and a
  // time, and no model has ever run over it.
  expect(content).toContain('Detection model not installed');
  expect(content).toContain('No disease model');
  // A stored confidence is not a diagnosis and must never be shown as one.
  expect(content).not.toContain('Anthracnose');
  expect(content).not.toContain('0.96');
  expect(content).not.toMatch(/\d+\s?%/);
  expect(content).not.toContain('Recommended remedy');
});

test('a captured photo is in history afterwards', async () => {
  const tree = render(<AppNavigator />);
  press(tree, 'History');
  expect(screenText(tree)).toContain('No scans yet');

  press(tree, 'Scan a fruit');
  await pressAsync(tree, 'Take photo');

  press(tree, 'History');
  const content = screenText(tree);
  // Stored, and stored honestly — the row claims no fruit, because none was
  // identified.
  expect(content).toContain('Unidentified');
  expect(content).toContain('Not identified — no model installed');
  expect(content).not.toContain('No scans yet');
});

// --- navigation affordances -------------------------------------------------

test('a variety row opens that variety', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Mango');

  const before = screenText(tree);
  press(tree, 'Carabao');

  expect(screenText(tree)).not.toBe(before);
});

test('the model status screen is reachable and its import control is live', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Settings');
  press(tree, 'Detection models');

  expect(screenText(tree)).toContain('No models declared');
  expect(typeof findPressable(tree, 'Import a model file').props.onPress).toBe('function');
});
