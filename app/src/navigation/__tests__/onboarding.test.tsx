import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { OnboardingGate, type OnboardingGateProps } from '../render/onboarding';
import { textOf } from '../../testing/interaction';

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

test('an install that has not picked a language sees that screen first', () => {
  expect(render({ languagePicked: false, syncMode: null, consented: false }))
    .toContain('Choose your language');
});

test('a language-picked install with no sync mode sees Welcome', () => {
  expect(render({ syncMode: null, consented: false })).toContain('Keep your scans');
});

test('an account install that owes the disclosure sees consent', () => {
  expect(render({ syncMode: 'account', consented: false })).toContain('What PrutasAI sends');
});

test('an offline install that has just requested an account owes the disclosure too', () => {
  expect(render({ syncMode: 'offline', consented: false, accountRequested: true }))
    .toContain('What PrutasAI sends');
});

test('an offline consented install is past the gates', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<OnboardingGate {...BASE} />); });
  expect(tree.toJSON()).toBeNull();
});
