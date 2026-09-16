import React from 'react';
import renderer, { act } from 'react-test-renderer';
import App from '../../App';
import * as db from '../core/db/appDatabase';
import { press, textOf } from '../testing/interaction';

jest.mock('../core/db/appDatabase', () => ({
  prepareAppDatabase: jest.fn(),
}));

jest.mock('../navigation/AppNavigator', () => ({
  AppNavigator: () => {
    const { Text } = require('react-native');
    return <Text>Mocked AppNavigator</Text>;
  }
}));

describe('Startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('startup failure exposes the error and a non-destructive retry', async () => {
    const mockPrepare = db.prepareAppDatabase as jest.Mock;
    let promiseResolve: () => void;
    let promiseReject: (e: Error) => void;
    
    // First attempt will fail
    mockPrepare.mockReturnValueOnce(new Promise((resolve, reject) => {
      promiseResolve = resolve;
      promiseReject = reject;
    }));
    
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<App />);
    });
    
    // Fail the promise
    await act(async () => {
      promiseReject(new Error('Simulated startup failure'));
    });
    
    const text = textOf(tree!.root);
    expect(text).toContain('The app could not open its database');
    expect(text).toContain('Simulated startup failure');
    
    let promiseResolve2: () => void;
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
      promiseResolve2();
    });
    
    expect(mockPrepare).toHaveBeenCalledTimes(2);
  });
});
