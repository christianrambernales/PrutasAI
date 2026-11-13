import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, View } from 'react-native';
import { Chip } from '../../ui/components/controls';

function renderedChip(label: string): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Chip label={label} />);
  });
  return tree;
}

describe('runtime accessibility remediation', () => {
  it('bounds a long status chip so it cannot squeeze adjacent status text on narrow screens', () => {
    const tree = renderedChip('0 of 0 declared model files build-validated');
    const chip = tree.root.findAllByType(View)[0];

    expect(StyleSheet.flatten(chip.props.style).maxWidth).toBe('50%');
  });

  it('keeps short chips content-sized', () => {
    const tree = renderedChip('EN');
    const chip = tree.root.findAllByType(View)[0];

    expect(StyleSheet.flatten(chip.props.style).maxWidth).toBeUndefined();
  });
});
