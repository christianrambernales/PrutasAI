import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { OnboardingGate, type OnboardingGateProps } from '../render/onboarding';
import { findPressable, textOf } from '../../testing/interaction';

const BASE: OnboardingGateProps = {
  language: 'EN',
  languagePicked: true,
  syncMode: 'offline',
  consented: true,
  accountRequested: false,
  onPickLanguage: jest.fn(),
  onChooseOffline: jest.fn(),
  onChooseAccount: jest.fn(),
  onAcknowledgeConsent: jest.fn(),
  onSignIn: jest.fn(),
};

test('first-run install renders single WelcomeScreen gate with language, offline, account, and login options', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <OnboardingGate {...BASE} languagePicked={false} syncMode={null} consented={false} />,
    );
  });
  const text = textOf(tree.root);
  expect(text).toContain('Maligayang Pagdating sa PrutasAI');
  expect(text).toContain('Select Language');
  expect(text).toContain('Continue Fully Offline (Recommended)');
  expect(text).toContain('Create Account (Optional Sync)');
  expect(text).toContain('Already have an account? Log In');
  expect(text).not.toContain('Step 1 of 3');
  expect(text).not.toContain('Step 2 of 3');
  expect(text).not.toContain('Step 3 of 3');
});

test('tapping Continue Fully Offline immediately invokes offline onboarding completion', async () => {
  const onChooseOffline = jest.fn();
  const onAcknowledgeConsent = jest.fn();
  const onPickLanguage = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <OnboardingGate
        {...BASE}
        languagePicked={false}
        syncMode={null}
        consented={false}
        onPickLanguage={onPickLanguage}
        onChooseOffline={onChooseOffline}
        onAcknowledgeConsent={onAcknowledgeConsent}
      />,
    );
  });

  const offlineCard = findPressable(tree, 'Continue Fully Offline (Recommended)');
  await act(async () => {
    await offlineCard.props.onPress();
  });
  expect(onPickLanguage).toHaveBeenCalledWith('EN');
  expect(onChooseOffline).toHaveBeenCalledTimes(1);
  expect(onAcknowledgeConsent).toHaveBeenCalledTimes(1);
});

test('completion exposes initialNav at Home (gate returns null)', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<OnboardingGate {...BASE} />);
  });
  expect(tree.toJSON()).toBeNull();
});
