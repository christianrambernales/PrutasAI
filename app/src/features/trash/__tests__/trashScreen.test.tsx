import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TrashScreen } from '../TrashScreen';
import { findPressable, press, textOf } from '../../../testing/interaction';
import { LanguageProvider, strings, type Language } from '../../../ui';

const TRASHED = [
  { uuid: 't1', title: 'Old chat', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: '2026-08-20T00:00:00.000Z' },
  { uuid: 't2', title: 'Another chat', createdAt: '2026-08-05T00:00:00.000Z', updatedAt: '2026-08-05T00:00:00.000Z', deletedAt: '2026-08-25T00:00:00.000Z' },
];

function render(props: Partial<React.ComponentProps<typeof TrashScreen>> = {}, language: Language = 'EN') {
  const defaults: React.ComponentProps<typeof TrashScreen> = {
    conversations: TRASHED, onRestore: jest.fn(), onDeleteForever: jest.fn(), now: () => new Date('2026-08-30T00:00:00.000Z'),
  };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <LanguageProvider language={language}>
        <TrashScreen {...defaults} {...props} />
      </LanguageProvider>,
    );
  });
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
  expect(text).toContain('5 days left');
  expect(text).toContain('10 days left');
});

test('a single row can be restored without selecting anything', async () => {
  const onRestore = jest.fn();
  const { tree } = render({ onRestore });
  act(() => { press(tree, 'Old chat'); });
  await act(async () => { press(tree, 'Restore'); });
  expect(onRestore).toHaveBeenCalledWith(['t1']);
});

test('selecting multiple rows and restoring applies to all of them', async () => {
  const onRestore = jest.fn();
  const { tree } = render({ onRestore });
  act(() => { press(tree, 'Select'); });
  act(() => { press(tree, 'Old chat'); });
  act(() => { press(tree, 'Another chat'); });
  await act(async () => { press(tree, 'Restore'); });
  expect(onRestore).toHaveBeenCalledWith(expect.arrayContaining(['t1', 't2']));
});

test('failed restore keeps the row selected and offers Retry', async () => {
  const onRestore = jest.fn().mockRejectedValue(new Error('database path must stay private'));
  const { tree } = render({ onRestore });
  act(() => { press(tree, 'Old chat'); });
  await act(async () => { press(tree, 'Restore'); });
  expect(textOf(tree.root)).toContain('Old chat');
  expect(textOf(tree.root)).toContain('Try again');
  expect(textOf(tree.root)).not.toContain('database path must stay private');
  await act(async () => { press(tree, 'Try again'); });
  expect(onRestore).toHaveBeenCalledTimes(2);
  expect(onRestore).toHaveBeenNthCalledWith(2, ['t1']);
});

test('delete permanently does not mutate until confirmed', async () => {
  const onDeleteForever = jest.fn().mockResolvedValue(undefined);
  const { tree } = render({ onDeleteForever });
  act(() => { press(tree, 'Select'); });
  act(() => { press(tree, 'Old chat'); });
  act(() => { press(tree, 'Delete permanently'); });

  // Modal opens but callback is not invoked yet
  expect(onDeleteForever).not.toHaveBeenCalled();

  const modalText = textOf(tree.root);
  expect(modalText).toContain('Permanently delete this conversation?');
  expect(modalText).toContain('This will erase them from this device immediately');

  // Inert cancel/Back
  act(() => { press(tree, 'Cancel'); });
  expect(onDeleteForever).not.toHaveBeenCalled();

  // Re-open and confirm
  act(() => { press(tree, 'Delete permanently'); });
  await act(async () => { press(tree, 'Delete permanently'); });

  expect(onDeleteForever).toHaveBeenCalledWith(['t1']);
});

test('retains selection and shows Retry on error', async () => {
  const onDeleteForever = jest.fn().mockRejectedValue(new Error('Network error'));
  const { tree } = render({ onDeleteForever });
  act(() => { press(tree, 'Select'); });
  act(() => { press(tree, 'Old chat'); });
  act(() => { press(tree, 'Delete permanently'); });

  await act(async () => { press(tree, 'Delete permanently'); });

  // Expected to fail, so we should see Retry
  const text = textOf(tree.root);
  expect(text).toContain('Try again');
  // It should also show the generic local error string which is "We could not complete that action" etc.
  expect(text).toContain('We could not complete that action');
});

test.each<Language>(['EN', 'FIL'])('R17 trash distinguishes selection, restore, and confirmed deletion (%s)', language => {
  const t = strings(language);
  const { tree } = render({}, language);

  const row = findPressable(tree, `${TRASHED[0].title}, ${t.daysLeft(5)}`);
  expect(row.props.accessibilityRole).toBe('button');
  expect(row.props.accessibilityState).toMatchObject({ selected: false });

  press(tree, t.select);
  expect(findPressable(tree, t.cancel).props.accessibilityLabel).toBe(t.cancel);
  press(tree, `${TRASHED[0].title}, ${t.daysLeft(5)}`);
  expect(row.props.accessibilityState).toMatchObject({ selected: true });

  press(tree, t.deleteForever);
  const dialog = tree.root.find(node => node.props.accessibilityViewIsModal === true);
  expect(dialog).toBeDefined();
  expect(tree.root.find(node => node.props.accessibilityRole === 'alert')).toBeDefined();
  expect(findPressable(tree, t.cancel).props.accessibilityLabel).toBe(t.cancel);
});
