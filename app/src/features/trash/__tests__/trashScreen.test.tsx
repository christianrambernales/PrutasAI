import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TrashScreen } from '../TrashScreen';
import { press, pressAsync, textOf } from '../../../testing/interaction';
import { LanguageProvider, strings, type Language } from '../../../ui';
import { RouteBody } from '../../../navigation/render/routes';
import { makeShell } from '../../../testing/shellFixture';

const TRASHED = [
  { uuid: 't1', title: 'Old chat', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', deletedAt: '2026-08-20T00:00:00.000Z' },
  { uuid: 't2', title: 'Another chat', createdAt: '2026-08-05T00:00:00.000Z', updatedAt: '2026-08-05T00:00:00.000Z', deletedAt: '2026-08-25T00:00:00.000Z' },
];

function render(props: Partial<React.ComponentProps<typeof TrashScreen>> = {}, language: Language = 'EN') {
  const defaults: React.ComponentProps<typeof TrashScreen> = {
    conversations: TRASHED,
    onRestore: jest.fn(),
    onDeleteForever: jest.fn(),
    now: () => new Date('2026-08-30T00:00:00.000Z'),
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

test('lists every trashed conversation with its title and omits batch-select toolbar', () => {
  const { tree } = render();
  const text = textOf(tree.root);
  expect(text).toContain('Old chat');
  expect(text).toContain('Another chat');
  expect(text).toContain('5 days left');
  expect(text).toContain('10 days left');
  expect(text).not.toContain('Select');
  expect(text).not.toContain('Delete permanently');
});

test('a single row can be restored directly without selecting anything first', async () => {
  const onRestore = jest.fn();
  const { tree } = render({ onRestore });
  await pressAsync(tree, 'Restore Old chat');
  expect(onRestore).toHaveBeenCalledWith(['t1']);

  await pressAsync(tree, 'Restore Another chat');
  expect(onRestore).toHaveBeenCalledWith(['t2']);
});

test('failed restore shows safe error and offers Retry on that row', async () => {
  const onRestore = jest.fn().mockRejectedValue(new Error('database path must stay private'));
  const { tree } = render({ onRestore });
  await pressAsync(tree, 'Restore Old chat');

  const text = textOf(tree.root);
  expect(text).toContain('Old chat');
  expect(text).toContain('We could not complete that action');
  expect(text).toContain('Try again');
  expect(text).not.toContain('database path must stay private');

  await pressAsync(tree, 'Try again');
  expect(onRestore).toHaveBeenCalledTimes(2);
  expect(onRestore).toHaveBeenNthCalledWith(2, ['t1']);
});

test.each<Language>(['EN', 'FIL'])('renders prototype v2 copy and back actions (%s)', language => {
  const t = strings(language);
  const onBack = jest.fn();
  const { tree } = render({ onBack }, language);
  const text = textOf(tree.root);

  expect(text).toContain(language === 'FIL' ? 'Basurahan (Trash)' : 'Trash Manager');
  expect(text).toContain(language === 'FIL' ? 'Ibalik' : 'Restore');

  press(tree, t.goBack);
  press(tree, language === 'FIL' ? 'Bumalik sa Account' : 'Back to Account');
  expect(onBack).toHaveBeenCalledTimes(2);
});

describe('TrashScreen via RouteBody', () => {
  test('invokes shell.nav.back when Back or Back to Account is pressed and renders direct Restore buttons', async () => {
    const base = makeShell();
    const shell = {
      ...base,
      data: {
        ...base.data,
        trashedConversations: TRASHED,
      },
    };
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LanguageProvider language="EN">
          <RouteBody shell={shell} route={{ name: 'trash' }} />
        </LanguageProvider>,
      );
    });

    const text = textOf(tree.root);
    expect(text).not.toContain('Select');
    expect(text).toContain('Old chat');
    expect(text).toContain('Restore');

    press(tree, shell.t.goBack);
    press(tree, 'Back to Account');
    expect(shell.nav.back).toHaveBeenCalledTimes(2);
  });
});
