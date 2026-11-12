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
};

function render(over: Partial<OnboardingGateProps>): string {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<OnboardingGate {...BASE} {...over} />); });
  return textOf(tree.root);
}

test('D-01: an install that has not picked a language sees that screen first', () => {
  expect(render({ languagePicked: false, syncMode: null, consented: false }))
    .toContain('Choose your language');
});

test('D-01: a language-picked install with no sync mode sees Welcome (retained language)', () => {
  expect(render({ syncMode: null, consented: false })).toContain('Keep your scans');
});

test('D-02: an account install that owes the disclosure sees consent', () => {
  expect(render({ syncMode: 'account', consented: false })).toContain('What PrutasAI sends');
});

test('D-02: an offline install that has just requested an account owes the disclosure too', () => {
  expect(render({ syncMode: 'offline', consented: false, accountRequested: true }))
    .toContain('What PrutasAI sends');
});

test('D-01: completion exposes initialNav at Home (gates pass by returning null)', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<OnboardingGate {...BASE} />); });
  expect(tree.toJSON()).toBeNull();
});

test('D-01: LanguagePickScreen exposes correct CTA and handles loading/error', async () => {
  let rejectSave: (e: Error) => void = () => {};
  let resolveSave: () => void = () => {};
  const mockOnPick = jest.fn(() => new Promise<void>((resolve, reject) => {
    resolveSave = resolve;
    rejectSave = reject;
  }));

  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<OnboardingGate {...BASE} languagePicked={false} onPickLanguage={mockOnPick} />); });

  expect(textOf(tree.root)).toContain('Step 1 of 3: Language');
  
  // Select English
  const englishBtn = findPressable(tree, 'English');
  await act(async () => { englishBtn.props.onPress(); });

  // Submit
  const ctaBtn = tree.root.findAll(node => node.props.label === 'Continue to mode selection')[0];
  await act(async () => { ctaBtn.props.onPress(); });
  
  // Loading state
  const loadingBtn = findPressable(tree, 'Continue to mode selection');
  expect(loadingBtn.props.accessibilityState?.disabled).toBe(true);
  expect(textOf(tree.root)).toContain('Saving…');

  // Error injection
  await act(async () => { rejectSave(new Error('Network error')); });
  
  // Error state and retry
  expect(textOf(tree.root)).toContain('Could not save your choice.');
  const retryBtn = tree.root.findAll(node => node.props.label === 'Try again' || node.props.label === 'Retry')[0];
  
  // Try again
  await act(async () => { retryBtn.props.onPress(); });
  await act(async () => { resolveSave(); });
});

test('D-02: WelcomeScreen exposes correct CTAs and handles error', async () => {
  let rejectSave: (e: Error) => void = () => {};
  let resolveSave: () => void = () => {};
  const mockOnAccount = jest.fn(() => new Promise<void>((resolve, reject) => {
    resolveSave = resolve;
    rejectSave = reject;
  }));

  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<OnboardingGate {...BASE} syncMode={null} consented={false} onChooseAccount={mockOnAccount} />); });

  expect(textOf(tree.root)).toContain('Step 2 of 3: Mode');
  
  // Select Account
  const accountBtn = findPressable(tree, 'Sign in or create an account');
  await act(async () => { accountBtn.props.onPress(); });

  // Submit
  const ctaBtn = tree.root.findAll(node => node.props.label === 'Review consent')[0];
  await act(async () => { ctaBtn.props.onPress(); });
  
  await act(async () => { rejectSave(new Error('Failed!')); });
  expect(textOf(tree.root)).toContain('Could not save your choice.');
});

test('D-02: ConsentScreen exposes exact CTAs and handles error', async () => {
  let rejectSave: (e: Error) => void = () => {};
  let resolveSave: () => void = () => {};
  const mockOnAcknowledge = jest.fn(() => new Promise<void>((resolve, reject) => {
    resolveSave = resolve;
    rejectSave = reject;
  }));

  let tree!: ReactTestRenderer;
  await act(async () => { tree = renderer.create(<OnboardingGate {...BASE} syncMode="account" consented={false} onAcknowledgeConsent={mockOnAcknowledge} />); });

  expect(textOf(tree.root)).toContain('Step 3 of 3: Consent');
  
  const ctaBtn = tree.root.findAll(node => node.props.label === 'Finish setup and go to Home')[0];
  await act(async () => { ctaBtn.props.onPress(); });
  
  await act(async () => { rejectSave(new Error('Failed!')); });
  expect(textOf(tree.root)).toContain('Could not save your choice.');
});
