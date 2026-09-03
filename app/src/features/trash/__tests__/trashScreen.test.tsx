import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TrashScreen } from '../TrashScreen';
import { press, textOf } from '../../../testing/interaction';

const TRASHED = [
  { uuid: 't1', title: 'Old chat', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: '2026-08-20T00:00:00.000Z' },
  { uuid: 't2', title: 'Another chat', createdAt: '2026-08-05T00:00:00.000Z', updatedAt: '2026-08-05T00:00:00.000Z', deletedAt: '2026-08-25T00:00:00.000Z' },
];

function render(props: Partial<React.ComponentProps<typeof TrashScreen>> = {}) {
  const defaults: React.ComponentProps<typeof TrashScreen> = {
    conversations: TRASHED, onRestore: jest.fn(), onDeleteForever: jest.fn(), now: () => new Date('2026-08-30T00:00:00.000Z'),
  };
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<TrashScreen {...defaults} {...props} />); });
  return { tree, props: { ...defaults, ...props } };
}

test('empty trash shows the empty message', () => {
  const { tree } = render({ conversations: [] });
  expect(textOf(tree.root)).toContain('Trash is empty');
});

test('lists every trashed conversation with its title', () => {
  const { tree } = render();
  const text = textOf(tree.root);
  expect(text).toContain('Old chat');
  expect(text).toContain('Another chat');
  // t1 deleted 10 days before `now` -> 15 - 10 = 5 days left.
  // t2 deleted 5 days before `now` -> 15 - 5 = 10 days left.
  expect(text).toContain('5 days left');
  expect(text).toContain('10 days left');
});

test('a single row can be restored without selecting anything', () => {
  const onRestore = jest.fn();
  const { tree } = render({ onRestore });
  act(() => { press(tree, 'Old chat'); });
  act(() => { press(tree, 'Restore'); });
  expect(onRestore).toHaveBeenCalledWith(['t1']);
});

test('selecting multiple rows and restoring applies to all of them', () => {
  const onRestore = jest.fn();
  const { tree } = render({ onRestore });
  act(() => { press(tree, 'Select'); });
  act(() => { press(tree, 'Old chat'); });
  act(() => { press(tree, 'Another chat'); });
  act(() => { press(tree, 'Restore'); });
  expect(onRestore).toHaveBeenCalledWith(expect.arrayContaining(['t1', 't2']));
});

test('delete permanently on a selection calls onDeleteForever with those uuids', () => {
  const onDeleteForever = jest.fn();
  const { tree } = render({ onDeleteForever });
  act(() => { press(tree, 'Select'); });
  act(() => { press(tree, 'Old chat'); });
  act(() => { press(tree, 'Delete permanently'); });
  expect(onDeleteForever).toHaveBeenCalledWith(['t1']);
});
