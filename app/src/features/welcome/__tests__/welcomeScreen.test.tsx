import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { WelcomeScreen } from '../WelcomeScreen';
import { press, pressAsync, textOf } from '../../../testing/interaction';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

test('each choice immediately calls its own handler without intermediate confirmation button', async () => {
  const onChooseAccount = jest.fn();
  const onChooseOffline = jest.fn();
  const tree = render(
    <WelcomeScreen onChooseAccount={onChooseAccount} onChooseOffline={onChooseOffline} />,
  );

  expect(textOf(tree.root)).not.toContain('Step 2 of 3');
  expect(textOf(tree.root)).not.toContain('Keep your scans on this phone, or across your devices');

  await pressAsync(tree, 'Create Account (Optional Sync)');
  expect(onChooseAccount).toHaveBeenCalledTimes(1);
  expect(onChooseOffline).not.toHaveBeenCalled();

  const tree2 = render(
    <WelcomeScreen onChooseAccount={onChooseAccount} onChooseOffline={onChooseOffline} />,
  );
  await pressAsync(tree2, 'Continue Fully Offline (Recommended)');
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

  await pressAsync(tree, 'Continue Fully Offline (Recommended)');

  const alert = tree.root.findAll(n => n.props.accessibilityRole === 'alert');
  expect(alert.some(n => n.props.accessibilityLiveRegion === 'assertive')).toBe(true);
  expect(textOf(tree.root)).toContain('Could not save your choice. It remains selected here.');
  expect(textOf(tree.root)).not.toContain('raw storage detail');
});
