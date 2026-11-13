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

function render(element: React.ReactElement): ReactTestRenderer {
  act(() => {
    currentTree = renderer.create(element);
  });
  return currentTree!;
}

function screenText(tree: ReactTestRenderer): string {
  return textOf(tree.root);
}

// --- the systemic guard -----------------------------------------------------

test.each(['Home', 'Climate', 'Assistant', 'History'])(
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
  press(tree, 'Assistant');

  typeInto(tree, 'Ask about', 'What varieties of mango are there?');
  press(tree, 'Send');

  expect(screenText(tree)).toContain('What varieties of mango are there?');
});

test('sending a question produces an answer', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Assistant');

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
  press(tree, 'Assistant');

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
  press(tree, 'Assistant');

  const before = screenText(tree);
  typeInto(tree, 'Ask about', '   ');
  press(tree, 'Send');

  expect(screenText(tree)).toBe(before);
});

test('asking a disease remedy question produces a grounded reply', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Assistant');

  const question = 'Anthracnose remedy';
  typeInto(tree, 'Ask ', question);
  press(tree, 'Send');

  expect(screenText(tree)).toContain(question);
  expect(screenText(tree)).toContain('Anthracnose');
});

// --- conversation sidebar ----------------------------------------------------

test('the Conversations action opens the sidebar showing the conversation just started', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Assistant');

  // A fresh conversation is only a row in the database once its first
  // message is sent — this is what proves the sidebar's list keeps up with
  // that without an app restart, not just that it opens.
  const question = 'What varieties of mango are there?';
  typeInto(tree, 'Ask ', question);
  press(tree, 'Send');

  // Already once, from the sent bubble in the transcript.
  const beforeMenu = screenText(tree).split(question).length - 1;
  press(tree, 'Conversations');
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
  press(tree, 'Assistant');

  const older = 'What varieties of mango are there?';
  typeInto(tree, 'Ask ', older);
  press(tree, 'Send');

  press(tree, 'Conversations');
  press(tree, 'New conversation');
  typeInto(tree, 'Ask ', 'What varieties of banana are there?');
  press(tree, 'Send');

  const titles = () =>
    tree.root
      .findAllByType(ConversationSidebar)[0]
      .props.conversations.map((c: { title: string }) => c.title);

  expect(titles()[0]).toContain('banana');

  // Reopen the older conversation and add a turn to it.
  press(tree, 'Conversations');
  press(tree, older);
  typeInto(tree, 'Ask ', 'What varieties of papaya are there?');
  press(tree, 'Send');

  expect(titles()[0]).toContain('mango');
});

// --- account & settings -----------------------------------------------------

test('opening Crop Location from Account opens the location picker', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Account');
  press(tree, 'Crop Location');

  const content = screenText(tree);
  expect(content).toContain('Select Location');
  expect(content).toContain('Davao City, Davao del Sur');
});

test('switching the language to Filipino on Account updates the label and app copy', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Account');

  press(tree, 'Language, English');

  expect(screenText(tree)).toContain('Filipino');
  expect(screenText(tree)).toContain('Account at Mga Setting');
});

test('the Account tab exposes offline/account sync mode selection', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Account');

  press(tree, 'Use account sync');
  expect(screenText(tree)).toContain('Sync Metadata');
  press(tree, 'Use offline');
  expect(screenText(tree)).toContain('Local Offline Only');
});

// --- history ----------------------------------------------------------------

test('choosing a history filter selects it', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'View History');

  press(tree, 'Diseased');

  expect(findPressable(tree, 'Diseased').props.accessibilityState?.selected).toBe(true);
});

test('a history filter narrows the list', () => {
  seedStoredScans();
  const tree = render(<AppNavigator />);
  press(tree, 'View History');

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
  press(tree, 'Camera');
  await pressAsync(tree, 'Take photo');

  const content = screenText(tree);
  expect(content).toContain('Disease Diagnosis: No Model Weights');
  expect(content).toContain('Photo retained in local SQLite repository');
  // The preview verdict must never reach a screen that claims a detection.
  expect(content).not.toContain('Anthracnose');
  expect(content).not.toContain('0.96');
  expect(content).not.toContain('Recommended remedy');
});

test('opening two different scans shows two different results', () => {
  seedStoredScans();
  const tree = render(<AppNavigator />);
  press(tree, 'View History');

  press(tree, 'Banana · Lakatan');
  const first = screenText(tree);
  press(tree, 'Home');
  press(tree, 'View History');

  press(tree, 'Mango · Carabao');
  const second = screenText(tree);

  expect(second).not.toBe(first);
  expect(first).toContain('Banana · Lakatan');
  expect(second).toContain('Mango · Carabao');
});

test('opening a stored scan reports what was stored and nothing more', () => {
  seedStoredScans();
  const tree = render(<AppNavigator />);
  press(tree, 'View History');

  press(tree, 'Banana · Lakatan');
  const content = screenText(tree);

  // The same honest state a fresh capture shows: the row carries a photo and a
  // time, and no model has ever run over it.
  expect(content).toContain('Disease Diagnosis: No Model Weights');
  expect(content).toContain('Record ID: Banana · Lakatan');
  // A stored confidence is not a diagnosis and must never be shown as one.
  expect(content).not.toContain('Anthracnose');
  expect(content).not.toContain('0.96');
  expect(content).not.toMatch(/\d+\s?%/);
  expect(content).not.toContain('Recommended remedy');
});

test('a captured photo is in history afterwards', async () => {
  const tree = render(<AppNavigator />);
  press(tree, 'View History');
  expect(screenText(tree)).toContain('Carabao Mango');

  press(tree, 'Home');
  press(tree, 'Camera');
  await pressAsync(tree, 'Take photo');

  press(tree, 'Home');
  press(tree, 'View History');
  const content = screenText(tree);
  // Stored, and stored honestly — the row claims no fruit, because none was
  // identified.
  expect(content).toContain('Unidentified');
  expect(content).toContain('Not identified because no approved model is installed.');
  expect(content).not.toContain('Carabao Mango');
});

// --- navigation affordances -------------------------------------------------

test('switching crop tabs on variety info changes the displayed crop', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Mango');

  const before = screenText(tree);
  press(tree, '🍌 Banana');

  const after = screenText(tree);
  expect(after).not.toBe(before);
  expect(after).toContain('Lakatan');
});

test('the model status screen is reachable and truthfully discloses no model weights', () => {
  const tree = render(<AppNavigator />);
  press(tree, 'Account');
  press(tree, 'AI Model Registry');

  expect(screenText(tree)).toContain('Thesis Phase Disclosure');
  expect(screenText(tree)).toContain('No Weights');
  expect(screenText(tree)).toContain('Pipeline Stages');
  expect(screenText(tree)).not.toContain('Import a model file');
  expect(screenText(tree)).not.toContain('bundled model is used instead');
});
