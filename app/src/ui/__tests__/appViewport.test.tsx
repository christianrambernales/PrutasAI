import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AppViewport } from '../components/AppViewport';

const originalPlatform = Platform.OS;
afterEach(() => { Object.defineProperty(Platform, 'OS', { value: originalPlatform }); });

test.each(['web', 'android'] as const)('%s keeps startup and overlay content inside an uncropped full-height shell', platform => {
  Object.defineProperty(Platform, 'OS', { value: platform });
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<AppViewport><Text>Startup retry</Text><Text>Photo review</Text></AppViewport>);
  });
  const viewport = tree.root.findAllByType(View).find(node => node.props.testID === 'app-viewport')!;
  const style = StyleSheet.flatten(viewport.props.style);
  expect(style).toMatchObject({ flex: 1, width: '100%' });
  expect(style.height).toBeUndefined();
  expect(style.paddingTop).toBeUndefined();
  expect(style.paddingBottom).toBeUndefined();
  expect(style.overflow).not.toBe('hidden');
  if (platform === 'web') expect(style).toMatchObject({ maxWidth: 395, alignSelf: 'center' });
  else expect(style.maxWidth).toBeUndefined();
  expect(viewport.findAllByType(Text).map(node => node.props.children)).toEqual(['Startup retry', 'Photo review']);
});
