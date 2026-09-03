import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { ConversationSidebar, isEdgeSwipe, opensSidebar, useEdgeSwipe } from '../ConversationSidebar';
import { press } from '../../../testing/interaction';

const CONVERSATIONS = [
  { uuid: 'c1', title: 'Banana care', createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z', deletedAt: null },
  { uuid: 'c2', title: 'Mango pests', createdAt: '2026-08-29T00:00:00.000Z', updatedAt: '2026-08-29T00:00:00.000Z', deletedAt: null },
];

function render(props: Partial<React.ComponentProps<typeof ConversationSidebar>> = {}) {
  const defaults: React.ComponentProps<typeof ConversationSidebar> = {
    visible: true, conversations: CONVERSATIONS, activeId: null,
    onSelect: jest.fn(), onNew: jest.fn(), onClose: jest.fn(),
    onRename: jest.fn(), onDelete: jest.fn(),
  };
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(<ConversationSidebar {...defaults} {...props} />); });
  return { tree, props: { ...defaults, ...props } };
}

test('lists every conversation by title', () => {
  const { tree } = render();
  const text = require('../../../testing/interaction').textOf(tree.root);
  expect(text).toContain('Banana care');
  expect(text).toContain('Mango pests');
});

test('tapping a conversation calls onSelect with its uuid and closes', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const { tree } = render({ onSelect, onClose });
  press(tree, 'Banana care');
  expect(onSelect).toHaveBeenCalledWith('c1');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('the new-conversation row calls onNew and closes', () => {
  const onNew = jest.fn();
  const onClose = jest.fn();
  const { tree } = render({ onNew, onClose });
  press(tree, 'New conversation');
  expect(onNew).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('when not visible, nothing is rendered', () => {
  const { tree } = render({ visible: false });
  expect(tree.toJSON()).toBeNull();
});

/**
 * Each row must paint above the rows below it, or its "..." dropdown is
 * covered by the next row and "Rename" cannot be tapped at all — the menu's
 * own zIndex cannot help, because react-native-web gives every View
 * `z-index: 0`, which makes each row its own stacking context.
 */
test('rows stack in descending order, so a row menu paints over the rows below', () => {
  const { tree } = render();
  const zIndexes = tree.root
    .findAll(
      n =>
        typeof n.type === 'string' &&
        Array.isArray(n.props.style) &&
        n.props.style.some((s: unknown) => !!s && typeof (s as { zIndex?: unknown }).zIndex === 'number'),
      { deep: true },
    )
    .map(n => {
      const layer = (n.props.style as { zIndex?: number }[]).find(s => !!s && typeof s.zIndex === 'number');
      return layer!.zIndex;
    });

  expect(zIndexes).toEqual([2, 1]);
});

// --- the edge swipe that opens the sidebar -----------------------------------

test('an edge swipe is a horizontal drag that began inside the edge strip', () => {
  expect(isEdgeSwipe(8, 50, 4)).toBe(true);
});

test('a drag that began away from the edge is not an edge swipe', () => {
  // The start is what decides: by the time a drag is long enough to recognise,
  // the finger has already travelled well past the strip.
  expect(isEdgeSwipe(200, 50, 4)).toBe(false);
});

test('a vertical scroll starting at the edge is left to the ScrollView', () => {
  expect(isEdgeSwipe(8, 12, 90)).toBe(false);
});

test('a short flick does not open the sidebar', () => {
  expect(opensSidebar(20)).toBe(false);
  expect(opensSidebar(60)).toBe(true);
});

/**
 * The gesture has to be claimed on press. It leaves the edge strip within a
 * few pixels, and the strip is out of the event path from then on, so a
 * responder that waits for the first move is never offered the gesture again.
 */
test('a press inside the edge strip claims the gesture; one outside does not', () => {
  type StartHandler = (event: { nativeEvent: { pageX: number } }) => boolean;
  let handlers!: { onStartShouldSetResponder: StartHandler };
  function Host() {
    handlers = useEdgeSwipe(() => {}).panHandlers as unknown as typeof handlers;
    return null;
  }
  act(() => { renderer.create(<Host />); });

  expect(handlers.onStartShouldSetResponder({ nativeEvent: { pageX: 8 } })).toBe(true);
  expect(handlers.onStartShouldSetResponder({ nativeEvent: { pageX: 200 } })).toBe(false);
});
