/**
 * App-level state that outlives a single screen: preferences, the history
 * filter, the saved place, and the transient notice strip.
 *
 * Screens stay presentational — they receive values and callbacks. Keeping this
 * a pure reducer means every control's behaviour is testable without a renderer,
 * which is what the original screens lacked: each stateful control was passed a
 * literal and a `() => {}`, so nothing could move.
 */

export type Language = 'EN' | 'FIL';

export interface SavedLocation {
  label: string;
  /** Rounded before storage; the app never keeps a precise fix. */
  latitude: number;
  longitude: number;
}

export interface AppState {
  language: Language;
  useLocation: boolean;
  /** Whether the remote assistant may be used at all. Off by default. */
  aiAssistant: boolean;
  historyFilter: string;
  /** null when the search field is closed, '' when open and empty. */
  historyQuery: string | null;
  savedLocation: SavedLocation | null;
  /** Which fruit the climate verdict is answering for. */
  suitabilityFruit: string;
  notice: string | null;
}

export type AppAction =
  | { type: 'setLanguage'; language: Language }
  | { type: 'toggleLocation' }
  | { type: 'setLocation'; location: SavedLocation }
  | { type: 'forgetLocation' }
  | { type: 'toggleAiAssistant' }
  | { type: 'setHistoryFilter'; filter: string }
  | { type: 'openSearch' }
  | { type: 'setHistoryQuery'; query: string }
  | { type: 'closeSearch' }
  | { type: 'setSuitabilityFruit'; fruitKey: string }
  | { type: 'notify'; message: string }
  | { type: 'dismissNotice' };

export const ALL_FILTER = 'All';

export const initialAppState: AppState = {
  language: 'EN',
  useLocation: false,
  aiAssistant: false,
  historyFilter: ALL_FILTER,
  historyQuery: null,
  savedLocation: null,
  suitabilityFruit: 'banana',
  notice: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'setLanguage':
      return state.language === action.language ? state : { ...state, language: action.language };

    case 'toggleLocation':
      return { ...state, useLocation: !state.useLocation };

    // Choosing a place is itself the consent to use one.
    case 'setLocation':
      return { ...state, savedLocation: action.location, useLocation: true };

    case 'forgetLocation':
      return { ...state, savedLocation: null, useLocation: false };

    case 'toggleAiAssistant':
      return { ...state, aiAssistant: !state.aiAssistant };

    case 'setHistoryFilter':
      return state.historyFilter === action.filter
        ? state
        : { ...state, historyFilter: action.filter };

    case 'openSearch':
      return state.historyQuery === null ? { ...state, historyQuery: '' } : state;

    case 'setHistoryQuery':
      return { ...state, historyQuery: action.query };

    case 'closeSearch':
      return state.historyQuery === null ? state : { ...state, historyQuery: null };

    case 'setSuitabilityFruit':
      return state.suitabilityFruit === action.fruitKey
        ? state
        : { ...state, suitabilityFruit: action.fruitKey };

    case 'notify':
      return { ...state, notice: action.message };

    case 'dismissNotice':
      return state.notice === null ? state : { ...state, notice: null };
  }
}
