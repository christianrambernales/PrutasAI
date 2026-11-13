import { useCallback, useMemo, useRef, useState } from 'react';
import { useEdgeSwipe } from './ConversationSidebar';
import type { useChat } from './useChat';
import {
  listActiveConversations, renameConversation, softDeleteConversation, restoreConversation,
  type ConversationSummary,
} from '../../core/db/repositories/conversations';
import type { SqlDriver } from '../../core/db/driver';
import type { LocalAccountScope } from '../../core/db/repositories/scans';
import type { TabKey } from '../../navigation/navState';

type Chat = ReturnType<typeof useChat>;

/** The native/web controls used to return focus after a sidebar closes. */
export interface SidebarFocusTarget {
  focus?: () => void;
}

export interface ConversationsUiInput {
  db: SqlDriver;
  chat: Chat;
  dataVersion: number;
  /** Invalidates every dataVersion-keyed read after a write. */
  bumpData: () => void;
  scope?: LocalAccountScope;
}

export interface ConversationsUi {
  sidebarOpen: boolean;
  openSidebar: (invoker?: SidebarFocusTarget | null) => void;
  closeSidebar: () => void;
  edgeSwipe: ReturnType<typeof useEdgeSwipe>;
  list: ConversationSummary[];
  rename: (uuid: string, title: string) => void;
  remove: (uuid: string) => void;
  restore: (uuid: string) => { success: boolean; error?: string };
  selectTab: (tab: TabKey, dispatchSelect: (tab: TabKey) => void) => void;
}

export function useConversationsUi(input: ConversationsUiInput): ConversationsUi {
  const { db, chat, dataVersion, bumpData, scope = { activeAccountId: null } } = input;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarInvoker = useRef<SidebarFocusTarget | null>(null);
  const openSidebar = useCallback((invoker?: SidebarFocusTarget | null) => {
    // A swipe has no explicit React ref. On web retain the active element so
    // Escape/backdrop close can still return focus to where the overlay began.
    const activeElement = typeof document === 'undefined'
      ? null
      : document.activeElement as SidebarFocusTarget | null;
    sidebarInvoker.current = invoker ?? activeElement;
    setSidebarOpen(true);
  }, []);
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    // React Native Web exposes `focus()` on the underlying control. Native
    // platforms may not, where the sidebar itself has already moved
    // accessibility focus to its first action; the optional call keeps both
    // paths safe without pretending a DOM API exists everywhere.
    setTimeout(() => sidebarInvoker.current?.focus?.(), 0);
  }, []);
  const edgeSwipe = useEdgeSwipe(() => openSidebar());

  // Recomputed whenever a write elsewhere bumps dataVersion, whenever useChat
  // opens a brand new conversation (its id moves off null) — that is what makes
  // a chat just started from an empty draft show up in the sidebar without
  // waiting on an unrelated write — and whenever a turn is added to the open
  // conversation.
  //
  // That last dependency is why the message count is here. `persist()` bumps
  // `conversation.updated_at` on every message and the sidebar sorts on that
  // column, but sending into the conversation already on screen changes neither
  // the id nor dataVersion. The list was therefore never re-queried, and the
  // sidebar kept the order from whenever something else last happened: correct

  // Recomputed whenever a write elsewhere bumps dataVersion, whenever useChat
  // opens a brand new conversation (its id moves off null) — that is what makes
  // a chat just started from an empty draft show up in the sidebar without
  // waiting on an unrelated write — and whenever a turn is added to the open
  // conversation.
  //
  // That last dependency is why the message count is here. `persist()` bumps
  // `conversation.updated_at` on every message and the sidebar sorts on that
  // column, but sending into the conversation already on screen changes neither
  // the id nor dataVersion. The list was therefore never re-queried, and the
  // sidebar kept the order from whenever something else last happened: correct
  // in the database, stale on screen until the app was relaunched.
  const list = useMemo(
    () => listActiveConversations(db, scope),
    [db, scope, dataVersion, chat.conversationId, chat.messages.length],
  );

  const rename = useCallback((uuid: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const success = renameConversation(db, uuid, trimmed, new Date().toISOString(), scope);
      if (success) bumpData();
    } catch (cause) {
      console.warn('Rename failed', cause);
    }
  }, [db, bumpData, scope]);

  const remove = useCallback((uuid: string) => {
    try {
      const success = softDeleteConversation(db, uuid, new Date().toISOString(), scope);
      if (success) bumpData();
    } catch (cause) {
      console.warn('Remove failed', cause);
    }
  }, [db, bumpData, scope]);

  const restore = useCallback((uuid: string) => {
    try {
      const success = restoreConversation(db, uuid, new Date().toISOString(), scope);
      if (success) {
        bumpData();
        return { success: true };
      }
      return { success: false, error: 'not_found' };
    } catch (cause) {
      console.warn('Restore failed', cause);
      return { success: false, error: 'database_error' };
    }
  }, [db, bumpData, scope]);

  // Opening the Chat tab always starts a fresh conversation; resuming a past
  // one is what the sidebar is for.
  const selectTab = useCallback((tab: TabKey, dispatchSelect: (tab: TabKey) => void) => {
    if (tab === 'chat') chat.startNewConversation();
    dispatchSelect(tab);
  }, [chat.startNewConversation]);

  return { sidebarOpen, openSidebar, closeSidebar, edgeSwipe, list, rename, remove, restore, selectTab };
}
