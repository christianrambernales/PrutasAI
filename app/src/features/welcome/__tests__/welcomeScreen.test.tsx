import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { WelcomeScreen } from '../WelcomeScreen';
import { findPressable, press, textOf } from '../../../testing/interaction';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

test('each choice calls its own handler', () => {
  const onChooseAccount = jest.fn();
  const onChooseOffline = jest.fn();
  const tree = render(
    <WelcomeScreen onChooseAccount={onChooseAccount} onChooseOffline={onChooseOffline} />,
  );

  // The screen renders a heading and a button with the same words for each
  // choice, so this also pins that the shared helper still selects the
  // pressable rather than the heading.
  expect(findPressable(tree, 'Sign in or create an account').props.accessibilityState?.selected).toBe(false);
  press(tree, 'Sign in or create an account');
  expect(findPressable(tree, 'Sign in or create an account').props.accessibilityState?.selected).toBe(true);
  expect(findPressable(tree, 'Use offline').props.accessibilityState?.selected).toBe(false);
  press(tree, 'Review consent');
  expect(onChooseAccount).toHaveBeenCalledTimes(1);
  expect(onChooseOffline).not.toHaveBeenCalled();

  const tree2 = render(
    <WelcomeScreen onChooseAccount={onChooseAccount} onChooseOffline={onChooseOffline} />,
  );
  press(tree2, 'Use offline');
  expect(findPressable(tree2, 'Use offline').props.accessibilityState?.selected).toBe(true);
  press(tree2, 'Finish setup and go to Home');
  expect(onChooseOffline).toHaveBeenCalledTimes(1);
  // Still one: pressing offline must not have gone through the account handler.
  expect(onChooseAccount).toHaveBeenCalledTimes(1);
});

test('a failed onboarding save is announced without exposing the thrown error', async () => {
  const tree = render(
    <WelcomeScreen
      onChooseAccount={jest.fn()}
      onChooseOffline={async () => { throw new Error('raw storage detail'); }}
    />,
  );

  press(tree, 'Use offline');
  press(tree, 'Finish setup and go to Home');
  await act(async () => { await Promise.resolve(); });

  const alert = tree.root.findAll(n => n.props.accessibilityRole === 'alert');
  expect(alert.some(n => n.props.accessibilityLiveRegion === 'assertive')).toBe(true);
  expect(textOf(tree.root)).toContain('Could not save your choice. It remains selected here.');
  expect(textOf(tree.root)).not.toContain('raw storage detail');
});
