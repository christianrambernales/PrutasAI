/**
 * Navigation is four tabs with a per-session stack of detail screens on top.
 * Kept as a pure reducer so the routing rules are testable without a renderer,
 * and so no navigation dependency is needed for an offline-first app.
 */

export type TabKey = 'home' | 'climate' | 'chat' | 'history';

export type Route =
  | { name: 'capture' }
  | { name: 'result'; scanId: string }
  | { name: 'varietyInfo'; fruitKey: string }
  | { name: 'monitoring'; sessionId: string }
  | { name: 'settings' }
  | { name: 'modelStatus' };

export interface NavState {
  tab: TabKey;
  stack: Route[];
}

export type NavAction =
  | { type: 'selectTab'; tab: TabKey }
  | { type: 'push'; route: Route }
  | { type: 'back' };

export const initialNav: NavState = { tab: 'home', stack: [] };

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'selectTab':
      return { tab: action.tab, stack: [] };
    case 'push':
      return { ...state, stack: [...state.stack, action.route] };
    case 'back':
      if (state.stack.length === 0) return state;
      return { ...state, stack: state.stack.slice(0, -1) };
  }
}

export function currentRoute(state: NavState): Route | null {
  return state.stack.length === 0 ? null : state.stack[state.stack.length - 1];
}

export function canGoBack(state: NavState): boolean {
  return state.stack.length > 0;
}
