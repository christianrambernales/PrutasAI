import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { LanguageProvider } from '../../../ui';
import { LanguagePickScreen } from '../LanguagePickScreen';
import { findPressable, press, textOf } from '../../../testing/interaction';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

test('picking English retains the choice until the exact mode-selection CTA is pressed', () => {
  const onPick = jest.fn();
  const tree = render(<LanguagePickScreen onPick={onPick} />);

  expect(findPressable(tree, 'English').props.accessibilityState?.selected).toBe(false);
  press(tree, 'English');
  expect(findPressable(tree, 'English').props.accessibilityState?.selected).toBe(true);
  expect(findPressable(tree, 'Filipino').props.accessibilityState?.selected).toBe(false);
  expect(onPick).not.toHaveBeenCalled();
  press(tree, 'Continue to mode selection');

  expect(onPick).toHaveBeenCalledWith('EN');
});

test('picking Filipino uses the Filipino CTA and calls onPick with FIL', () => {
  const onPick = jest.fn();
  const tree = render(
    <LanguageProvider language="FIL">
      <LanguagePickScreen onPick={onPick} />
    </LanguageProvider>,
  );

  press(tree, 'Filipino');
  expect(findPressable(tree, 'Filipino').props.accessibilityState?.selected).toBe(true);
  press(tree, 'Magpatuloy sa pagpili ng mode');

  expect(onPick).toHaveBeenCalledWith('FIL');
  expect(onPick).toHaveBeenCalledTimes(1);
});

test('a language save error has a localized live announcement and keeps the language label', async () => {
  const tree = render(
    <LanguageProvider language="FIL">
      <LanguagePickScreen onPick={async () => { throw new Error('raw storage detail'); }} />
    </LanguageProvider>,
  );

  press(tree, 'Filipino');
  press(tree, 'Magpatuloy sa pagpili ng mode');
  await act(async () => { await Promise.resolve(); });

  const alert = tree.root.findAll(n => n.props.accessibilityRole === 'alert');
  expect(alert.some(n => n.props.accessibilityLiveRegion === 'assertive')).toBe(true);
  expect(textOf(tree.root)).toContain('Hindi ma-save ang iyong pinili. Nananatili ang pinili mo rito.');
  expect(textOf(tree.root)).not.toContain('raw storage detail');
});
