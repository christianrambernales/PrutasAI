import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TypingIndicator } from '../TypingIndicator';

test('renders three dots', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<TypingIndicator />); });
  expect(tree.root.findAll(node => node.props.testID === 'typing-dot')).toHaveLength(3);
});
