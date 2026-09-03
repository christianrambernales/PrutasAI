import { resetAppDatabase } from './appDatabase';
import { strings } from '../ui/i18n/strings';
import { initialAppState } from '../state/appState';
import type { Shell } from '../navigation/shell';

/** One Shell with every group present, so a renderer can be mounted alone. */
export function makeShell(over: Partial<Shell> = {}): Shell {
  const db = resetAppDatabase();
  const t = strings('EN');
  return {
    t,
    nav: {
      push: jest.fn(), replace: jest.fn(), back: jest.fn(), notify: jest.fn(),
      selectTab: jest.fn(),
      openVariety: null, setOpenVariety: jest.fn(),
      openCheckpoint: null, setOpenCheckpoint: jest.fn(),
    },
    data: {
      db, fruits: [], varietiesByFruit: {}, strainsByFruit: {}, sourcesByFruit: {},
      scanGroups: [], allScans: [], trashedConversations: [],
      statuses: [], capability: { headline: '', detail: '' } as never,
      depth: 0, readyCount: 0, aiAvailable: false, bumpData: jest.fn(),
    },
    app: initialAppState,
    dispatchApp: jest.fn(),
    climate: {
      climate: {
        status: 'idle', current: null, normals: null, fetchedAt: null,
        error: null, refresh: jest.fn(),
      } as never,
      snapshot: null, normals: null, suitabilityFor: () => null,
      savedLocationLabel: 'No location saved',
    },
    history: { filters: [], visibleGroups: [], visibleCount: 0 },
    account: {
      account: { email: null, accessToken: '', busy: false, error: null, resetMessage: null },
      openAccount: jest.fn(), signIn: jest.fn(), signUp: jest.fn(),
      forgotPassword: jest.fn(), signOut: jest.fn(),
    },
    chat: {
      messages: [], draft: '', setDraft: jest.fn(), send: jest.fn(), ask: jest.fn(),
      clear: jest.fn(), pending: false, conversationId: null,
      startNewConversation: jest.fn(), openConversation: jest.fn(),
    } as never,
    conversations: {
      sidebarOpen: false, openSidebar: jest.fn(), closeSidebar: jest.fn(),
      edgeSwipe: { panHandlers: {} } as never, list: [],
      rename: jest.fn(), remove: jest.fn(), selectTab: jest.fn(),
    },
    ...over,
  };
}
