import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { WelcomeScreen } from '../WelcomeScreen';
import { press } from '../../../testing/interaction';

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
  press(tree, 'Sign in or create an account');
  expect(onChooseAccount).toHaveBeenCalledTimes(1);
  expect(onChooseOffline).not.toHaveBeenCalled();

  press(tree, 'Use offline');
  expect(onChooseOffline).toHaveBeenCalledTimes(1);
  // Still one: pressing offline must not have gone through the account handler.
  expect(onChooseAccount).toHaveBeenCalledTimes(1);
});
