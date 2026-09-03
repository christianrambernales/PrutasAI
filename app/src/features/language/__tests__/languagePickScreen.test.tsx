import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { LanguagePickScreen } from '../LanguagePickScreen';
import { press } from '../../../testing/interaction';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

test('picking English calls onPick with EN', () => {
  const onPick = jest.fn();
  const tree = render(<LanguagePickScreen onPick={onPick} />);

  press(tree, 'English');

  expect(onPick).toHaveBeenCalledWith('EN');
});

test('picking Filipino calls onPick with FIL', () => {
  const onPick = jest.fn();
  const tree = render(<LanguagePickScreen onPick={onPick} />);

  press(tree, 'Filipino');

  expect(onPick).toHaveBeenCalledWith('FIL');
  expect(onPick).toHaveBeenCalledTimes(1);
});
