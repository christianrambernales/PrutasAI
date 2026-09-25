import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { RouteBar, RouteBody } from '../../../navigation/render/routes';
import { makeShell } from '../../../testing/shellFixture';
import { findPressable, textOf } from '../../../testing/interaction';
import { strings } from '../../../ui/i18n/strings';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

test('reachable model status route uses the selected language and never offers device import', () => {
  const shell = makeShell();
  shell.app = { ...shell.app, language: 'FIL' };

  const tree = render(<RouteBody shell={shell} route={{ name: 'modelStatus' }} />);
  const content = textOf(tree.root);

  expect(content).toContain('Hindi pa napatutunayan ang inference');
  expect(content).toContain('Paano mag-import ng mga modelo');
  expect(content).not.toContain('Mag-import ng file ng modelo');
  expect(content).not.toMatch(/diagnos(?:is|tic)/i);
});

test('refresh toast localizes build-validation counts and keeps inference separate', () => {
  const shell = makeShell({ t: strings('FIL') });
  shell.data.statuses = [{}, {}, {}] as never;
  shell.data.readyCount = 2;

  const tree = render(<RouteBar shell={shell} route={{ name: 'modelStatus' }} />);
  act(() => {
    findPressable(tree, shell.t.rereadRegistry).props.onPress();
  });

  expect(shell.nav.notify).toHaveBeenCalledWith(shell.t.modelRegistryRefreshed(2, 3));
  expect(shell.nav.notify).toHaveBeenCalledWith(expect.stringContaining(shell.t.modelInferenceUnverified));
});
