import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { getSyncMode } from '../../core/db/syncMode';
import { resetAppDatabase, seedConsent, seedLanguagePicked } from '../../testing/appDatabase';
import { ConsentScreen } from '../consent/ConsentScreen';
import { press, pressAsync, textOf } from '../../testing/interaction';
import { LanguageProvider } from '../../ui';

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
  resetAppDatabase();
  seedLanguagePicked();
});

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<AppNavigator />);
  });
  renderedTrees.push(tree);
  return tree;
}

function chooseOffline(tree: ReactTestRenderer): void {
  press(tree, 'Use offline');
  press(tree, 'Finish setup and go to Home');
}

function chooseAccount(tree: ReactTestRenderer): void {
  press(tree, 'Sign in or create an account');
  press(tree, 'Review consent');
}

function acknowledgeConsent(tree: ReactTestRenderer): void {
  press(tree, 'Finish setup and go to Home');
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
  chooseOffline(tree);
  const content = textOf(tree.root);
  expect(content).not.toContain('What PrutasAI sends');
  expect(content).toContain('Open camera');
});

test('choosing an account shows the disclosure before anything else', () => {
  const tree = render();
  chooseAccount(tree);
  const content = textOf(tree.root);
  expect(content).toContain('What PrutasAI sends');
  // The home screen is behind it, not beside it.
  expect(content).not.toContain('Open camera');
});

test('the disclosure names both what is sent and what never is', () => {
  const tree = render();
  chooseAccount(tree);
  const content = textOf(tree.root);
  expect(content).toContain('a coarse location');
  expect(content).toContain('Your photograph, your name, and your exact position.');
});

test('acknowledging it, having chosen an account, opens sign-in rather than Home', () => {
  const tree = render();
  chooseAccount(tree);
  acknowledgeConsent(tree);
  const content = textOf(tree.root);
  expect(content).toContain('Sign in');
  expect(content).not.toContain('What PrutasAI sends');
});

test('it is not shown again after acknowledgement', () => {
  const first = render();
  chooseAccount(first);
  acknowledgeConsent(first);

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
  chooseOffline(tree);
  press(tree, 'Settings');
  press(tree, 'Account');

  const content = textOf(tree.root);
  expect(content).toContain('What PrutasAI sends');
  // The sign-up form is behind the disclosure, not beside it.
  expect(content).not.toContain('Sign in and your scan history follows you');
});

test('acknowledging it from Settings continues on to the account screen', () => {
  const tree = render();
  chooseOffline(tree);
  press(tree, 'Settings');
  press(tree, 'Account');
  acknowledgeConsent(tree);

  const content = textOf(tree.root);
  expect(content).toContain('Sign in and your scan history follows you');
  expect(content).not.toContain('What PrutasAI sends');
});

test('choosing account sync from Settings retains that selection through consent', () => {
  const db = resetAppDatabase();
  seedLanguagePicked();
  const tree = render();

  chooseOffline(tree);
  press(tree, 'Settings');
  press(tree, 'Use account sync');
  expect(textOf(tree.root)).toContain('What PrutasAI sends');

  acknowledgeConsent(tree);
  expect(getSyncMode(db)).toBe('account');
  expect(textOf(tree.root)).toContain('Use offline');
  expect(textOf(tree.root)).toContain('Sign in and sync are optional.');
});

test('an offline user is not asked a second time once they have acknowledged', () => {
  const tree = render();
  chooseOffline(tree);
  press(tree, 'Settings');
  press(tree, 'Account');
  acknowledgeConsent(tree);
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
  chooseAccount(tree);

  const content = textOf(tree.root);
  expect(content).not.toContain('What PrutasAI sends');
  expect(content).toContain('Sign in and your scan history follows you');
  // Not dropped on Home with nothing to show for the button they pressed.
  expect(content).not.toContain('Open camera');
});

test('the same disclosure stays discoverable in Settings', () => {
  const tree = render();
  chooseAccount(tree);
  acknowledgeConsent(tree);
  // Landed on sign-in, not Home — go there to reach Settings.
  press(tree, 'Home');
  press(tree, 'Settings');
  expect(textOf(tree.root)).toContain('What is uploaded');
});

test('consent acknowledgement and retry are named controls; save failures are announced safely in Filipino', async () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <LanguageProvider language="FIL">
        <ConsentScreen onAcknowledge={async () => { throw new Error('raw database detail'); }} />
      </LanguageProvider>,
    );
  });

  const actionLabels = () => tree.root
    .findAll(n => n.props.accessibilityRole === 'button')
    .map(n => n.props.accessibilityLabel);
  expect(actionLabels()).toContain('Tapusin ang setup at pumunta sa Home');
  await pressAsync(tree, 'Tapusin ang setup at pumunta sa Home');

  const alert = tree.root.findAll(n => n.props.accessibilityRole === 'alert');
  expect(alert.some(n => n.props.accessibilityLiveRegion === 'assertive')).toBe(true);
  expect(textOf(tree.root)).toContain('Hindi ma-save ang iyong pinili. Nananatili ang pinili mo rito.');
  expect(textOf(tree.root)).not.toContain('raw database detail');
  expect(actionLabels()).toContain('Subukang muli');
});
