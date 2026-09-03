import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { resetAppDatabase, seedConsent, seedLanguagePicked } from '../../testing/appDatabase';
import { press, textOf } from '../../testing/interaction';

beforeEach(() => {
  resetAppDatabase();
  seedLanguagePicked();
});

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<AppNavigator />); });
  return tree;
}

test('a fresh install sees the Welcome choice before anything else', () => {
  const content = textOf(render().root);
  expect(content).toContain('Sign in or create an account');
  expect(content).toContain('Use offline');
  // Neither the disclosure nor the app itself is shown until a choice is made.
  expect(content).not.toContain('What PrutasAI sends');
  expect(content).not.toContain('Open camera');
});

test('choosing offline skips the disclosure entirely, since it sends nothing', () => {
  const tree = render();
  press(tree, 'Use offline');
  const content = textOf(tree.root);
  expect(content).not.toContain('What PrutasAI sends');
  expect(content).toContain('Open camera');
});

test('choosing an account shows the disclosure before anything else', () => {
  const tree = render();
  press(tree, 'Sign in or create an account');
  const content = textOf(tree.root);
  expect(content).toContain('What PrutasAI sends');
  // The home screen is behind it, not beside it.
  expect(content).not.toContain('Open camera');
});

test('the disclosure names both what is sent and what never is', () => {
  const tree = render();
  press(tree, 'Sign in or create an account');
  const content = textOf(tree.root);
  expect(content).toContain('a coarse location');
  expect(content).toContain('Your photograph, your name, and your exact position.');
});

test('acknowledging it, having chosen an account, opens sign-in rather than Home', () => {
  const tree = render();
  press(tree, 'Sign in or create an account');
  press(tree, 'Got it');
  const content = textOf(tree.root);
  expect(content).toContain('Sign in');
  expect(content).not.toContain('What PrutasAI sends');
});

test('it is not shown again after acknowledgement', () => {
  const first = render();
  press(first, 'Sign in or create an account');
  press(first, 'Got it');

  // A second mount against the same database is the next app launch.
  const second = render();
  expect(textOf(second.root)).not.toContain('What PrutasAI sends');
  expect(textOf(second.root)).toContain('Open camera');
});

test('an offline user reaching Settings then Account sees the disclosure first', () => {
  // Spec §4: the disclosure is shown when the user chooses an account at first
  // run, and again when an offline user later creates one from Settings — the
  // point at which it becomes true. Without this the whole local history
  // uploads on sign-in having never been disclosed.
  const tree = render();
  press(tree, 'Use offline');
  press(tree, 'Settings');
  press(tree, 'Account');

  const content = textOf(tree.root);
  expect(content).toContain('What PrutasAI sends');
  // The sign-up form is behind the disclosure, not beside it.
  expect(content).not.toContain('Sign in and your scan history follows you');
});

test('acknowledging it from Settings continues on to the account screen', () => {
  const tree = render();
  press(tree, 'Use offline');
  press(tree, 'Settings');
  press(tree, 'Account');
  press(tree, 'Got it');

  const content = textOf(tree.root);
  expect(content).toContain('Sign in and your scan history follows you');
  expect(content).not.toContain('What PrutasAI sends');
});

test('an offline user is not asked a second time once they have acknowledged', () => {
  const tree = render();
  press(tree, 'Use offline');
  press(tree, 'Settings');
  press(tree, 'Account');
  press(tree, 'Got it');
  press(tree, 'Home');
  press(tree, 'Settings');
  press(tree, 'Account');

  expect(textOf(tree.root)).not.toContain('What PrutasAI sends');
  expect(textOf(tree.root)).toContain('Sign in and your scan history follows you');
});

test('an install that already consented still lands on sign-in when it picks the account path', () => {
  // Every install that exists today has consent_seen_at set and no sync_mode
  // row, so the consent screen will not render for it — and the push used to
  // live only inside that screen's acknowledge handler.
  resetAppDatabase();
  seedLanguagePicked();
  seedConsent();

  const tree = render();
  press(tree, 'Sign in or create an account');

  const content = textOf(tree.root);
  expect(content).not.toContain('What PrutasAI sends');
  expect(content).toContain('Sign in and your scan history follows you');
  // Not dropped on Home with nothing to show for the button they pressed.
  expect(content).not.toContain('Open camera');
});

test('the same disclosure stays discoverable in Settings', () => {
  const tree = render();
  press(tree, 'Sign in or create an account');
  press(tree, 'Got it');
  // Landed on sign-in, not Home — go there to reach Settings.
  press(tree, 'Home');
  press(tree, 'Settings');
  expect(textOf(tree.root)).toContain('What is uploaded');
});
