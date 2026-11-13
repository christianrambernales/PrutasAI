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

  expect(content).toContain('Katayuan ng AI Model');
  expect(content).toContain('Yugto ng Thesis Prototype');
  expect(content).toContain('Mga Yugto ng Pipeline (Pipeline Stages)');
  expect(content).toContain('Walang Weights');
  expect(content).not.toContain('Mag-import ng file ng modelo');
  expect(content).not.toMatch(/diagnos(?:is|tic)/i);
});

test('model status route omits the misleading registry refresh control and retains Back', () => {
  const shell = makeShell({ t: strings('FIL') });
  const tree = render(<RouteBody shell={shell} route={{ name: 'modelStatus' }} />);

  expect(tree.root.findAll(node => node.props.accessibilityLabel === shell.t.rereadRegistry)).toHaveLength(0);
  act(() => {
    findPressable(tree, 'Go back').props.onPress();
  });

  expect(shell.nav.back).toHaveBeenCalledTimes(1);
});
