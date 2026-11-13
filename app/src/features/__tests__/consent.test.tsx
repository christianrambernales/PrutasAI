import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { getSyncMode } from '../../core/db/syncMode';
import { resetAppDatabase, seedConsent, seedLanguagePicked, seedSyncMode } from '../../testing/appDatabase';
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

async function chooseOffline(tree: ReactTestRenderer): Promise<void> {
  await pressAsync(tree, 'Continue Fully Offline (Recommended)');
}

async function chooseAccount(tree: ReactTestRenderer): Promise<void> {
  await pressAsync(tree, 'Create Account (Optional Sync)');
}

test('a fresh install sees the Welcome choice before anything else', () => {
  const content = textOf(render().root);
  expect(content).toContain('Continue Fully Offline (Recommended)');
  expect(content).toContain('Create Account (Optional Sync)');
  expect(content).toContain('Already have an account? Log In');
  expect(content).not.toContain('Take or Choose Photo');
});

test('choosing offline goes straight to Home and keeps sync mode offline', async () => {
  const db = resetAppDatabase();
  seedLanguagePicked();
  const tree = render();
  await chooseOffline(tree);
  const content = textOf(tree.root);
  expect(getSyncMode(db)).toBe('offline');
  expect(content).toContain('Take or Choose Photo');
});

test('choosing an account discloses optional cloud sync on Welcome and opens sign-up rather than Home', async () => {
  const db = resetAppDatabase();
  seedLanguagePicked();
  const tree = render();
  const welcomeText = textOf(tree.root);
  expect(welcomeText).toContain('Photographs and records remain completely on-device');
  expect(welcomeText).toContain('Sync monitoring checkpoints across devices using your email');

  await chooseAccount(tree);
  const content = textOf(tree.root);
  expect(getSyncMode(db)).toBe('account');
  expect(content).toContain('Create Account');
  expect(content).not.toContain('Take or Choose Photo');
});

test('Welcome is not shown again on subsequent launch after onboarding', async () => {
  const first = render();
  await chooseAccount(first);

  // A second mount against the same database is the next app launch.
  const second = render();
  expect(textOf(second.root)).not.toContain('Maligayang Pagdating sa PrutasAI');
  expect(textOf(second.root)).toContain('Take or Choose Photo');
});

test('an offline install without consent sees Welcome disclosure when opening the Account tab', () => {
  const db = resetAppDatabase();
  seedLanguagePicked();
  seedSyncMode('offline');
  const tree = render();
  press(tree, 'Account');

  const content = textOf(tree.root);
  expect(content).toContain('Create Account (Optional Sync)');
  expect(content).not.toContain('Guest Farmer');
  expect(getSyncMode(db)).toBe('offline');
});

test('acknowledging account sync from the gate continues on to Create Account', async () => {
  resetAppDatabase();
  seedLanguagePicked();
  seedSyncMode('offline');
  const tree = render();
  press(tree, 'Account');
  await chooseAccount(tree);

  const content = textOf(tree.root);
  expect(content).toContain('Create Account');
  expect(content).toContain('Continue Offline');
});

test('Account tab sync mode toggles persist account vs offline selection in SQLite', async () => {
  const db = resetAppDatabase();
  seedLanguagePicked();
  const tree = render();

  await chooseOffline(tree);
  press(tree, 'Account');
  expect(textOf(tree.root)).toContain('Account & Settings');
  await pressAsync(tree, 'Use account sync');
  expect(getSyncMode(db)).toBe('account');
  await pressAsync(tree, 'Use offline');
  expect(getSyncMode(db)).toBe('offline');
});

test('an offline user is not re-gated on Account once consent has been acknowledged', async () => {
  resetAppDatabase();
  seedLanguagePicked();
  seedSyncMode('offline');
  const tree = render();
  press(tree, 'Account');
  await chooseAccount(tree);
  press(tree, 'Cancel');
  press(tree, 'Home');
  press(tree, 'Account');

  const content = textOf(tree.root);
  expect(content).not.toContain('Maligayang Pagdating sa PrutasAI');
  expect(content).toContain('Account & Settings');
  expect(content).toContain('Guest Farmer');
});

test('an install that already consented still lands on Create Account when it picks the account path', async () => {
  resetAppDatabase();
  seedLanguagePicked();
  seedConsent();

  const tree = render();
  await chooseAccount(tree);

  const content = textOf(tree.root);
  expect(content).toContain('Create Account');
  expect(content).not.toContain('Take or Choose Photo');
});

test('account sign-in link on Welcome opens Log In directly', async () => {
  const tree = render();
  await pressAsync(tree, 'Already have an account? Log In');
  const content = textOf(tree.root);
  expect(content).toContain('Log In');
  expect(content).toContain('Email Address');
  expect(content).not.toContain('Take or Choose Photo');
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
