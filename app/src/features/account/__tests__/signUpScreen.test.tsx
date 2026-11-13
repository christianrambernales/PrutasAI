import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { SignUpScreen } from '../SignUpScreen';
import { press, pressableRoles, textInputs, textOf } from '../../../testing/interaction';
import { LanguageProvider } from '../../../ui';
import { RouteBody } from '../../../navigation/render/routes';
import { makeShell } from '../../../testing/shellFixture';

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
  typeByLabel(tree, 'Password', 'secret123');
  press(tree, 'Create account');

  expect(onSignUp).toHaveBeenCalledWith('grower@example.test', 'secret123');
});

test('passwords shorter than 8 characters show weak password error and do not call onSignUp', () => {
  const onSignUp = jest.fn();
  const tree = render(
    <SignUpScreen busy={false} error={null} onSignUp={onSignUp} onGoToSignIn={jest.fn()} />,
  );

  typeByLabel(tree, 'Email', 'grower@example.test');
  typeByLabel(tree, 'Password', 'secret');
  press(tree, 'Create account');

  expect(onSignUp).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('Password is too weak');
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

test('renders confirmation-pending view via EmailConfirmationScreen with resend, back to login, and continue offline actions', () => {
  const onResendConfirmation = jest.fn();
  const onContinueOffline = jest.fn();
  const onGoToSignIn = jest.fn();
  const tree = render(
    <SignUpScreen
      busy={false}
      error={null}
      confirmationPendingEmail="grower@example.test"
      onSignUp={jest.fn()}
      onGoToSignIn={onGoToSignIn}
      onResendConfirmation={onResendConfirmation}
      onContinueOffline={onContinueOffline}
    />,
  );

  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('Check your email');
  expect(text).toContain('grower@example.test');

  press(tree, 'Resend Email');
  expect(onResendConfirmation).toHaveBeenCalledWith('grower@example.test');

  press(tree, 'Back to Log In');
  expect(onGoToSignIn).toHaveBeenCalledTimes(1);

  press(tree, 'Continue Using Offline');
  expect(onContinueOffline).toHaveBeenCalledTimes(1);
});

test('busy state shows resending label and prevents double resend', () => {
  const onResendConfirmation = jest.fn();
  const tree = render(
    <SignUpScreen
      busy={true}
      error={null}
      confirmationPendingEmail="grower@example.test"
      onSignUp={jest.fn()}
      onGoToSignIn={jest.fn()}
      onResendConfirmation={onResendConfirmation}
    />,
  );

  press(tree, 'Resending…');
  expect(onResendConfirmation).not.toHaveBeenCalled();
});

test('sign-up fields, submit, and return-to-sign-in controls expose localized names and busy state', () => {
  const tree = render(
    <SignUpScreen busy={true} error={null} onSignUp={jest.fn()} onGoToSignIn={jest.fn()} />,
  );
  expect(Array.from(new Set(textInputs(tree).map(field => field.props.accessibilityLabel))))
    .toEqual(['Email', 'Password', 'Confirm password']);
  expect(pressableRoles(tree).map(action => action.props.accessibilityLabel)).toEqual([
    'Signing in…',
    'Already have an account? Sign in',
  ]);
  expect(pressableRoles(tree).every(action => action.props.accessibilityState?.disabled === true)).toBe(true);
});

test('Filipino sign-up actions are named in the selected language', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <LanguageProvider language="FIL">
        <SignUpScreen busy={false} error={null} onSignUp={jest.fn()} onGoToSignIn={jest.fn()} />
      </LanguageProvider>,
    );
  });

  expect(pressableRoles(tree).map(action => action.props.accessibilityLabel)).toEqual([
    'Gumawa ng akawnt',
    'May akawnt ka na? Mag-sign in',
  ]);
});

test('sign-up auth errors are announced as alerts without changing their safe bilingual text', () => {
  const tree = render(
    <SignUpScreen
      busy={false}
      error="Too many attempts. Please try again in a few minutes."
      onSignUp={jest.fn()}
      onGoToSignIn={jest.fn()}
    />,
  );

  const alert = tree.root.findAll(n => n.props.accessibilityRole === 'alert');
  expect(alert.some(n => n.props.accessibilityLiveRegion === 'assertive')).toBe(true);
});

test('signup route via RouteBody passes onCancel={back} and renders Continue Offline without lock icon', () => {
  const shell = makeShell();
  const tree = render(
    <LanguageProvider language="EN">
      <RouteBody shell={shell} route={{ name: 'signup' }} />
    </LanguageProvider>,
  );

  const text = textOf(tree.root);
  expect(text).toContain('Continue Offline');
  expect(text).not.toContain('🔒 Continue Offline');

  press(tree, shell.t.cancel);
  expect(shell.nav.back).toHaveBeenCalledTimes(1);
});
