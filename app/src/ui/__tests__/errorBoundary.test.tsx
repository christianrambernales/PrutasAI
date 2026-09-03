/**
 * A render-time throw used to unmount the whole tree and leave a white page.
 * The startup gate in App.tsx cannot catch it — that only awaits the database
 * warm-up, and this kind of error is thrown later, during render.
 */

import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppText } from '../components/primitives';

function renderedText(tree: ReactTestRenderer): string {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      found.push(node);
      return;
    }
    if (Array.isArray(node)) node.forEach(walk);
  };
  tree.root.findAllByType(AppText).forEach(node => walk(node.props.children));
  return found.join(' ');
}

function Boom(): React.ReactElement {
  throw new Error('database exploded');
}

// React logs the caught error to console.error by design. Silence it so a
// passing test does not read like a failing one.
let consoleError: jest.SpyInstance;
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
});

test('children render untouched when nothing throws', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ErrorBoundary>
        <AppText>all is well</AppText>
      </ErrorBoundary>,
    );
  });
  expect(renderedText(tree)).toContain('all is well');
});

test('a render-time throw shows the failure instead of nothing', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
  });
  const text = renderedText(tree);
  expect(text).toContain('The app hit an unexpected problem');
  expect(text).toContain('database exploded');
});
