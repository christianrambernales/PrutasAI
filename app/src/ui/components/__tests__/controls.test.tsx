import React from 'react';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { COLORS } from '../../tokens';

import { Button, PressableRow, Segmented, Toggle } from '../controls';

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex.match(/[0-9a-f]{2}/gi)!.map(channel => parseInt(channel, 16) / 255);
    const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const fg = luminance(foreground);
  const bg = luminance(background);
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
}

test('segmented controls use stable values while rendering localized labels at a 48dp target', () => {
  const onChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <Segmented
        options={[
          { value: 'offline', label: 'Gamitin nang offline' },
          { value: 'account', label: 'Gamitin ang account sync' },
        ]}
        value="offline"
        onChange={onChange}
      />,
    );
  });

  const account = tree.root.findAll(
    (node: ReactTestInstance) => node.props.accessibilityLabel === 'Gamitin ang account sync',
  )[0];
  expect(StyleSheet.flatten(account.props.style)).toMatchObject({ minHeight: 48 });

  act(() => { account.props.onPress(); });
  expect(onChange).toHaveBeenCalledWith('account');
});

test('full-width segmented controls keep long Filipino labels inside a narrow parent', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <Segmented
        fullWidth
        options={[
          { value: 'offline', label: 'Gamitin nang offline' },
          { value: 'account', label: 'Gamitin ang account sync' },
        ]}
        value="account"
      />,
    );
  });

  const account = tree.root.findAll(
    (node: ReactTestInstance) => node.props.accessibilityLabel === 'Gamitin ang account sync',
  )[0];
  const root = account.parent!;
  expect(StyleSheet.flatten(root.props.style)).toMatchObject({ alignSelf: 'stretch' });
  expect(StyleSheet.flatten(account.props.style)).toMatchObject({ flex: 1, minHeight: 48 });
});

test('shared controls expose their accessible names, roles, state, and minimum touch targets', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <>
        <Button label="Save locally" disabled />
        <Toggle on accessibilityLabel="Use account sync" />
        <PressableRow accessibilityLabel="Open settings" selected><></></PressableRow>
        <Segmented options={[{ value: 'en', label: 'English' }, { value: 'fil', label: 'Filipino' }]} value="fil" />
      </>,
    );
  });

  const save = tree.root.find(node => node.props?.accessibilityLabel === 'Save locally');
  expect(save.props.accessibilityRole).toBe('button');
  expect(save.props.accessibilityLabel).toBe('Save locally');
  expect(save.props.accessibilityState.disabled).toBe(true);
  expect(StyleSheet.flatten(save.props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(48);

  const toggle = tree.root.find(node => node.props?.accessibilityRole === 'switch');
  expect(toggle.props.accessibilityLabel).toBe('Use account sync');
  expect(toggle.props.accessibilityState.checked).toBe(true);
  expect(StyleSheet.flatten(toggle.props.style).minHeight).toBeGreaterThanOrEqual(48);

  const row = tree.root.find(node => node.props?.accessibilityLabel === 'Open settings' && node.props?.accessibilityRole === 'button');
  expect(row.props.accessibilityRole).toBe('button');
  expect(row.props.accessibilityState.selected).toBe(true);
  expect(StyleSheet.flatten(row.props.style({ pressed: false })).minHeight).toBeGreaterThanOrEqual(48);

  const selected = tree.root.find(node => node.props?.accessibilityLabel === 'Filipino' && node.props?.accessibilityRole === 'button');
  expect(selected.props.accessibilityRole).toBe('button');
  expect(selected.props.accessibilityState.selected).toBe(true);
  expect(StyleSheet.flatten(selected.props.style).minHeight).toBeGreaterThanOrEqual(48);
});

test('inactive segmented labels meet AA text contrast on their shared surface', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Segmented options={['English', 'Filipino']} value="Filipino" />);
  });
  const label = tree.root.find(node => node.props?.children === 'English' && node.props?.variant === 'smSemi');
  expect(contrastRatio(label.props.color, COLORS.surfaceAlt)).toBeGreaterThanOrEqual(4.5);
});
