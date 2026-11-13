import React from 'react';
import renderer, { act } from 'react-test-renderer';
import App from '../../App';
import * as db from '../core/db/appDatabase';
import * as fonts from 'expo-font';
import { Platform } from 'react-native';
import { press, textOf } from '../testing/interaction';

jest.mock('../core/db/appDatabase', () => ({
  prepareAppDatabase: jest.fn(),
}));

jest.mock('expo-font', () => ({ useFonts: jest.fn(), loadAsync: jest.fn(), unloadAsync: jest.fn() }));

jest.mock('../navigation/AppNavigator', () => ({
  AppNavigator: () => {
    const { Text } = require('react-native');
    return <Text>Mocked AppNavigator</Text>;
  }
}));

describe('Startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fonts.useFonts as jest.Mock).mockReturnValue([false, null]);
    (fonts.loadAsync as jest.Mock).mockResolvedValue(undefined);
    (fonts.unloadAsync as jest.Mock).mockResolvedValue(undefined);
  });

  test('startup failure exposes the error and a non-destructive retry', async () => {
    const mockPrepare = db.prepareAppDatabase as jest.Mock;
    let promiseResolve: (value: unknown) => void;
    let promiseReject: (e: Error) => void;
    
    // First attempt will fail
    mockPrepare.mockReturnValueOnce(new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    }));
    
    let tree: import('react-test-renderer').ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<App />);
    });
    
    // Fail the promise
    await act(async () => {
      promiseReject!(new Error('Simulated startup failure'));
    });
    
    const text = textOf(tree!.root);
    expect(text).toContain('The app could not open its database');
    expect(text).toContain('Hindi mabuksan ng app ang database nito');
    expect(text).not.toContain('Simulated startup failure');

    press(tree!, 'Show technical details');
    expect(textOf(tree!.root)).toContain('Simulated startup failure');
    
    let promiseResolve2: (value: unknown) => void;
    // Set up second attempt to hang until we check it
    mockPrepare.mockReturnValueOnce(new Promise((resolve) => {
      promiseResolve2 = resolve;
    }));
    
    // Click retry
    await act(async () => {
      press(tree!, 'Try again');
    });
    
    // Should transition to opening state again
    expect(textOf(tree!.root)).toContain('Opening your records…');
    
    // Resolve second attempt
    await act(async () => {
      promiseResolve2!(undefined);
    });
    
    expect(mockPrepare).toHaveBeenCalledTimes(2);
  });

  test('font loading does not delay a ready database or remount navigation', async () => {
    (db.prepareAppDatabase as jest.Mock).mockResolvedValue({});
    let tree!: import('react-test-renderer').ReactTestRenderer;
    await act(async () => { tree = renderer.create(<App />); });
    expect(textOf(tree.root)).toContain('Mocked AppNavigator');
    expect(db.prepareAppDatabase).toHaveBeenCalledTimes(1);
  });

  test('font errors show bilingual retry while database failures remain visible', async () => {
    (fonts.useFonts as jest.Mock).mockReturnValue([false, new Error('local font unavailable')]);
    (db.prepareAppDatabase as jest.Mock).mockRejectedValue(new Error('database unavailable'));
    let tree!: import('react-test-renderer').ReactTestRenderer;
    await act(async () => { tree = renderer.create(<App />); });
    expect(textOf(tree.root)).toContain('The app could not open its database');
    expect(textOf(tree.root)).toContain('Some text styles could not load');
    expect(textOf(tree.root)).toContain('Hindi na-load ang ilang estilo');
    await act(async () => { press(tree, 'Try again / Subukan ulit'); });
    expect(fonts.loadAsync).toHaveBeenCalledTimes(1);
    expect(textOf(tree.root)).not.toContain('Some text styles could not load');
    expect(textOf(tree.root)).toContain('The app could not open its database');
    expect(db.prepareAppDatabase).toHaveBeenCalledTimes(1);
  });

  test.each(['empty', 'rejected', 'success'])('web font retry verifies actual faces: %s', async outcome => {
    const platform = jest.replaceProperty(Platform, 'OS', 'web');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const fontLoad = outcome === 'rejected'
      ? jest.fn().mockRejectedValue(new Error('font offline'))
      : jest.fn().mockResolvedValue(outcome === 'empty' ? [] : [{ status: 'loaded' }]);
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { fonts: { load: fontLoad } } });
    try {
      (fonts.useFonts as jest.Mock).mockReturnValue([false, new Error('font observer timeout')]);
      (db.prepareAppDatabase as jest.Mock).mockResolvedValue({});
      let tree!: import('react-test-renderer').ReactTestRenderer;
      await act(async () => { tree = renderer.create(<App />); });
      await act(async () => { press(tree, 'Try again / Subukan ulit'); });
      expect(fontLoad).toHaveBeenCalledTimes(5);
      expect(db.prepareAppDatabase).toHaveBeenCalledTimes(1);
      if (outcome === 'success') expect(textOf(tree.root)).not.toContain('Some text styles could not load');
      else expect(textOf(tree.root)).toContain('Some text styles could not load');
      expect(textOf(tree.root)).toContain('Mocked AppNavigator');
    } finally {
      platform.restore();
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
      else Reflect.deleteProperty(globalThis, 'document');
    }
  });

  test('initial web CSS registration success still exposes a genuine face loading failure', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'web');
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const fontLoad = jest.fn().mockRejectedValue(new Error('font face decode failed'));
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { fonts: { load: fontLoad } } });
    try {
      // Safari/Firefox can report useFonts success immediately after CSS insertion.
      (fonts.useFonts as jest.Mock).mockReturnValue([true, null]);
      (db.prepareAppDatabase as jest.Mock).mockResolvedValue({});
      let tree!: import('react-test-renderer').ReactTestRenderer;
      await act(async () => { tree = renderer.create(<App />); });
      expect(fontLoad).toHaveBeenCalledTimes(5);
      expect(textOf(tree.root)).toContain('Some text styles could not load');
      expect(textOf(tree.root)).toContain('Mocked AppNavigator');
      fontLoad.mockResolvedValue([{ status: 'loaded' }]);
      await act(async () => { press(tree, 'Try again / Subukan ulit'); });
      expect(textOf(tree.root)).not.toContain('Some text styles could not load');
      expect(db.prepareAppDatabase).toHaveBeenCalledTimes(1);
    } finally {
      platform.restore();
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
      else Reflect.deleteProperty(globalThis, 'document');
    }
  });
});
