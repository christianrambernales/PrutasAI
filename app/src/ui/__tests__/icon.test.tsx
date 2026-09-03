import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Icon } from '../components/Icon';

function elementCount(name: 'gear' | 'home'): number {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Icon name={name} size={22} />);
  });
  return tree.root.findAll(n => typeof n.type === 'string').length;
}

test('the gear has teeth, so it does not read as a crosshair', () => {
  // 8 teeth + hub ring + outer body, each a host View, plus the wrapper.
  expect(elementCount('gear')).toBeGreaterThanOrEqual(10);
});

test('renders the menu icon without throwing', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Icon name="menu" size={22} />);
  });
  expect(tree.toJSON()).not.toBeNull();
});

test('renders the moreHorizontal icon without throwing', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Icon name="moreHorizontal" />);
  });
  expect(tree.toJSON()).not.toBeNull();
});
