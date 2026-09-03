import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useConversationsUi } from '../useConversationsUi';
import { resetAppDatabase } from '../../../testing/appDatabase';
import { insertConversation, newConversationUuid } from '../../../core/db/repositories/conversations';
import type { SqlDriver } from '../../../core/db/driver';

let db: SqlDriver;
beforeEach(() => { db = resetAppDatabase(); });

const CHAT = {
  conversationId: null as string | null,
  messages: [] as unknown[],
  startNewConversation: jest.fn(),
  openConversation: jest.fn(),
};

function mount(bumpData: () => void = jest.fn()) {
  let value!: ReturnType<typeof useConversationsUi>;
  function Host() {
    value = useConversationsUi({ db, chat: CHAT as never, dataVersion: 0, bumpData });
    return null;
  }
  act(() => { renderer.create(<Host />); });
  return { get value() { return value; } };
}

function seed(title: string): string {
  const uuid = newConversationUuid();
  const now = new Date().toISOString();
  insertConversation(db, { uuid, title, deviceId: 'device', createdAt: now, updatedAt: now });
  return uuid;
}

test('the sidebar starts closed and opens and closes on request', () => {
  const h = mount();
  expect(h.value.sidebarOpen).toBe(false);
  act(() => { h.value.openSidebar(); });
  expect(h.value.sidebarOpen).toBe(true);
  act(() => { h.value.closeSidebar(); });
  expect(h.value.sidebarOpen).toBe(false);
});

test('the list holds the stored conversations', () => {
  seed('Banana care');
  expect(mount().value.list.map(c => c.title)).toContain('Banana care');
});

test('renaming writes through and asks for a refresh', () => {
  const uuid = seed('Old title');
  const bump = jest.fn();
  const h = mount(bump);
  act(() => { h.value.rename(uuid, 'New title'); });
  expect(bump).toHaveBeenCalledTimes(1);
  expect(mount().value.list.map(c => c.title)).toContain('New title');
});

test('removing is a soft delete: it leaves the active list', () => {
  const uuid = seed('Doomed');
  const bump = jest.fn();
  const h = mount(bump);
  act(() => { h.value.remove(uuid); });
  expect(bump).toHaveBeenCalledTimes(1);
  expect(mount().value.list.map(c => c.title)).not.toContain('Doomed');
});

test('selecting the chat tab starts a fresh conversation', () => {
  const h = mount();
  CHAT.startNewConversation.mockClear();
  act(() => { h.value.selectTab('chat', jest.fn()); });
  expect(CHAT.startNewConversation).toHaveBeenCalledTimes(1);
});

test('selecting any other tab does not disturb the open conversation', () => {
  const h = mount();
  CHAT.startNewConversation.mockClear();
  const dispatchSelect = jest.fn();
  act(() => { h.value.selectTab('home', dispatchSelect); });
  expect(CHAT.startNewConversation).not.toHaveBeenCalled();
  expect(dispatchSelect).toHaveBeenCalledWith('home');
});
