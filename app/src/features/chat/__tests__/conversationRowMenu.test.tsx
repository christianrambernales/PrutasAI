import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { ConversationRowMenu } from '../ConversationRowMenu';
import { press } from '../../../testing/interaction';

test('opening the menu shows Rename and Delete, nothing else', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ConversationRowMenu currentTitle="Banana care" onRename={jest.fn()} onDelete={jest.fn()} />,
    );
  });
  act(() => { press(tree, 'More options'); });

  const text = require('../../../testing/interaction').textOf(tree.root);
  expect(text).toContain('Rename');
  expect(text).toContain('Delete');
  expect(text).not.toContain('Share');
  expect(text).not.toContain('Pin');
  expect(text).not.toContain('Archive');
});

test('choosing Delete calls onDelete and closes the menu', () => {
  const onDelete = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ConversationRowMenu currentTitle="Banana care" onRename={jest.fn()} onDelete={onDelete} />,
    );
  });
  act(() => { press(tree, 'More options'); });
  act(() => { press(tree, 'Delete'); });

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(require('../../../testing/interaction').textOf(tree.root)).not.toContain('Rename');
});

test('choosing Rename turns the title into an editable field, and submitting calls onRename', () => {
  const onRename = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ConversationRowMenu currentTitle="Banana care" onRename={onRename} onDelete={jest.fn()} />,
    );
  });
  act(() => { press(tree, 'More options'); });
  act(() => { press(tree, 'Rename'); });

  const input = require('../../../testing/interaction').textInputs(tree)[0];
  act(() => { input.props.onChangeText('Banana care v2'); });
  act(() => { input.props.onSubmitEditing(); });

  expect(onRename).toHaveBeenCalledWith('Banana care v2');
});
