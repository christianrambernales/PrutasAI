import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { SignUpScreen } from '../SignUpScreen';
import { press, textInputs } from '../../../testing/interaction';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

/** These fields carry an accessibilityLabel rather than a placeholder. */
function typeByLabel(tree: ReactTestRenderer, label: string, value: string): void {
  const field = textInputs(tree).find(n => n.props.accessibilityLabel === label);
  if (!field) throw new Error(`no field labelled ${JSON.stringify(label)}`);
  act(() => { field.props.onChangeText(value); });
}

test('submitting calls onSignUp with the typed email and password', () => {
  const onSignUp = jest.fn();
  const tree = render(
    <SignUpScreen busy={false} error={null} onSignUp={onSignUp} onGoToSignIn={jest.fn()} />,
  );

  typeByLabel(tree, 'Email', 'grower@example.test');
  typeByLabel(tree, 'Password', 'secret');
  press(tree, 'Create account');

  expect(onSignUp).toHaveBeenCalledWith('grower@example.test', 'secret');
});

test('the sign-in link calls onGoToSignIn rather than submitting', () => {
  const onSignUp = jest.fn();
  const onGoToSignIn = jest.fn();
  const tree = render(
    <SignUpScreen busy={false} error={null} onSignUp={onSignUp} onGoToSignIn={onGoToSignIn} />,
  );

  press(tree, 'Already have an account? Sign in');

  expect(onGoToSignIn).toHaveBeenCalledTimes(1);
  expect(onSignUp).not.toHaveBeenCalled();
});

test('a busy submit does not call onSignUp again', () => {
  const onSignUp = jest.fn();
  const tree = render(
    <SignUpScreen busy={true} error={null} onSignUp={onSignUp} onGoToSignIn={jest.fn()} />,
  );

  press(tree, 'Signing in…');

  expect(onSignUp).not.toHaveBeenCalled();
});

test('an error is shown', () => {
  const tree = render(
    <SignUpScreen busy={false} error="Email already registered" onSignUp={jest.fn()} onGoToSignIn={jest.fn()} />,
  );

  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('Email already registered');
});
