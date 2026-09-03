import { useCallback, useMemo, useState } from 'react';
import { useEdgeSwipe } from './ConversationSidebar';
import type { useChat } from './useChat';
import {
  listActiveConversations, renameConversation, softDeleteConversation,
  type ConversationSummary,
} from '../../core/db/repositories/conversations';
import type { SqlDriver } from '../../core/db/driver';
import type { TabKey } from '../../navigation/navState';

type Chat = ReturnType<typeof useChat>;

export interface ConversationsUiInput {
  db: SqlDriver;
  chat: Chat;
  dataVersion: number;
  /** Invalidates every dataVersion-keyed read after a write. */
  bumpData: () => void;
}

export interface ConversationsUi {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  edgeSwipe: ReturnType<typeof useEdgeSwipe>;
  list: ConversationSummary[];
  rename: (uuid: string, title: string) => void;
  remove: (uuid: string) => void;
  selectTab: (tab: TabKey, dispatchSelect: (tab: TabKey) => void) => void;
}

export function useConversationsUi(input: ConversationsUiInput): ConversationsUi {
  const { db, chat, dataVersion, bumpData } = input;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const edgeSwipe = useEdgeSwipe(openSidebar);

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
    () => listActiveConversations(db),
    [db, dataVersion, chat.conversationId, chat.messages.length],
  );

  const rename = useCallback((uuid: string, title: string) => {
    renameConversation(db, uuid, title, new Date().toISOString());
    bumpData();
  }, [db, bumpData]);

  const remove = useCallback((uuid: string) => {
    softDeleteConversation(db, uuid, new Date().toISOString());
    bumpData();
  }, [db, bumpData]);

  // Opening the Chat tab always starts a fresh conversation; resuming a past
  // one is what the sidebar is for.
  const selectTab = useCallback((tab: TabKey, dispatchSelect: (tab: TabKey) => void) => {
    if (tab === 'chat') chat.startNewConversation();
    dispatchSelect(tab);
  }, [chat.startNewConversation]);

  return { sidebarOpen, openSidebar, closeSidebar, edgeSwipe, list, rename, remove, selectTab };
}
