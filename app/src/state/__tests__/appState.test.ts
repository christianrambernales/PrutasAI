import { appReducer, initialAppState } from '../appState';

test('the language starts in English and can be switched', () => {
  const next = appReducer(initialAppState, { type: 'setLanguage', language: 'FIL' });
  expect(next.language).toBe('FIL');
});

test('the location toggle flips', () => {
  const on = appReducer(initialAppState, { type: 'toggleLocation' });
  expect(on.useLocation).toBe(!initialAppState.useLocation);
  expect(appReducer(on, { type: 'toggleLocation' }).useLocation).toBe(initialAppState.useLocation);
});

test('forgetting the location clears the saved place and turns location use off', () => {
  const placed = appReducer(
    { ...initialAppState, useLocation: true },
    { type: 'setLocation', location: { label: 'Davao City', latitude: 7.07, longitude: 125.61 } },
  );
  expect(placed.savedLocation?.label).toBe('Davao City');

  const cleared = appReducer(placed, { type: 'forgetLocation' });
  expect(cleared.savedLocation).toBeNull();
  expect(cleared.useLocation).toBe(false);
});

test('choosing a location implies the user consented to using it', () => {
  const next = appReducer(initialAppState, {
    type: 'setLocation',
    location: { label: 'Davao City', latitude: 7.07, longitude: 125.61 },
  });
  expect(next.useLocation).toBe(true);
});

test('the AI assistant toggle flips', () => {
  const next = appReducer(initialAppState, { type: 'toggleAiAssistant' });
  expect(next.aiAssistant).toBe(!initialAppState.aiAssistant);
});

test('the AI assistant is off until the user asks for it', () => {
  // It sends questions to a remote model, so it may not be opt-out.
  expect(initialAppState.aiAssistant).toBe(false);
});

test('a history filter replaces the previous one', () => {
  const a = appReducer(initialAppState, { type: 'setHistoryFilter', filter: 'Diseased' });
  expect(a.historyFilter).toBe('Diseased');
  const b = appReducer(a, { type: 'setHistoryFilter', filter: 'Banana' });
  expect(b.historyFilter).toBe('Banana');
});

test('search opens closed, and closing it discards the query', () => {
  expect(initialAppState.historyQuery).toBeNull();

  const open = appReducer(initialAppState, { type: 'openSearch' });
  expect(open.historyQuery).toBe('');

  const typed = appReducer(open, { type: 'setHistoryQuery', query: 'lakatan' });
  expect(typed.historyQuery).toBe('lakatan');

  expect(appReducer(typed, { type: 'closeSearch' }).historyQuery).toBeNull();
});

test('a notice can be raised and dismissed', () => {
  const raised = appReducer(initialAppState, { type: 'notify', message: 'Registry re-read' });
  expect(raised.notice).toBe('Registry re-read');
  expect(appReducer(raised, { type: 'dismissNotice' }).notice).toBeNull();
});

test('an unrelated action leaves the state object untouched', () => {
  const next = appReducer(initialAppState, { type: 'dismissNotice' });
  expect(next).toBe(initialAppState);
});
