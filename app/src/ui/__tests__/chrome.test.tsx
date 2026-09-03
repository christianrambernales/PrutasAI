import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { AppBar } from '../components/chrome';
import { press } from '../../testing/interaction';

function render(el: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  return tree;
}

test('a menu icon calls onMenu when pressed', () => {
  const onMenu = jest.fn();
  const tree = render(<AppBar title="Chat" menu="menu" onMenu={onMenu} />);
  press(tree, 'menu');
  expect(onMenu).toHaveBeenCalledTimes(1);
});
