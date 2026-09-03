import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { useChatRuntime, type ChatRuntime, type ChatRuntimeInput } from '../useChatRuntime';
import { freshDb } from '../../../core/db/testing/scanFixtures';
import { initialAppState } from '../../../state/appState';

function baseInput(db: ReturnType<typeof freshDb>): ChatRuntimeInput {
  return {
    db,
    notify: jest.fn(),
    app: initialAppState,
    fruits: [],
    varietiesByFruit: {},
    strainsByFruit: {},
    sourcesByFruit: {},
    climate: {
      climate: {
        status: 'idle', current: null, normals: null, fetchedAt: null,
        error: null, refresh: jest.fn(),
      } as never,
      snapshot: null, normals: null, suitabilityFor: () => null,
      savedLocationLabel: 'No location saved',
    },
    capability: { headline: 'Detection model not installed', detail: 'detail' } as never,
    depth: 0,
    bumpData: jest.fn(),
  };
}

function run(input: ChatRuntimeInput): ChatRuntime {
  let runtime!: ChatRuntime;
  function Harness() {
    runtime = useChatRuntime(input);
    return null;
  }
  act(() => { renderer.create(<Harness />); });
  return runtime;
}

test('the assistant is unavailable when no proxy base URL is configured', () => {
  const runtime = run(baseInput(freshDb()));
  // EXPO_PUBLIC_API_URL is unset under test, so the proxy has nowhere to go.
  expect(runtime.aiAvailable).toBe(false);
});

test('the runtime exposes a usable chat', () => {
  const runtime = run(baseInput(freshDb()));
  expect(runtime.chat.messages).toEqual([]);
  expect(typeof runtime.chat.send).toBe('function');
  expect(runtime.chat.conversationId).toBeNull();
});
