import React from 'react';
import { AppBar, TabItem } from '../../ui';
import { ChatScreen } from '../../features/chat/ChatScreen';
import { ClimateScreen } from '../../features/climate/ClimateScreen';
import { HistoryScreen } from '../../features/history/HistoryScreen';
import { HomeScreen } from '../../features/home/HomeScreen';
import * as preview from '../../preview/previewContent';
import type { TabKey } from '../navState';
import type { Shell } from '../shell';

type Strings = Shell['t'];

/** The four bottom-navigation entries. AppNavigator renders the bar itself. */
export function tabItems(t: Strings): TabItem[] {
  return [
    { key: 'home', label: t.tabHome, icon: 'home' },
    { key: 'climate', label: t.tabClimate, icon: 'cloud' },
    { key: 'chat', label: t.tabChat, icon: 'chat' },
    { key: 'history', label: t.tabHistory, icon: 'history' },
  ];
}

function tabTitle(t: Strings): Record<TabKey, string> {
  return {
    home: 'PrutasAI',
    climate: t.tabClimate,
    chat: t.titleAssistant,
    history: t.tabHistory,
  };
}

export function TabBar({ shell, tab }: { shell: Shell; tab: TabKey }) {
  const { t, app, dispatchApp, climate, chat, conversations } = shell;
  const { notify } = shell.nav;
  const TAB_TITLE = tabTitle(t);

  if (tab === 'home') return null;
  if (tab === 'climate') {
    return (
      <AppBar
        title={TAB_TITLE.climate}
        action="refresh"
        actionLabel={t.refreshClimate}
        onAction={() => {
          if (!app.savedLocation) {
            notify('Choose a location first — there is nothing to refresh yet.');
            return;
          }
          climate.climate.refresh();
        }}
      />
    );
  }
  if (tab === 'history') {
    return (
      <AppBar
        title={TAB_TITLE.history}
        action="search"
        actionLabel={t.searchScans}
        onAction={() =>
          dispatchApp({ type: app.historyQuery === null ? 'openSearch' : 'closeSearch' })
        }
      />
    );
  }
  return (
    <AppBar
      title={TAB_TITLE.chat}
      subtitle={
        app.aiAssistant && shell.data.aiAvailable
          ? t.onlineSubtitle
          : t.groundedSubtitle
      }
      menu="menu"
      onMenu={conversations.openSidebar}
      action="trash"
      actionLabel={t.clearConversation}
      onAction={chat.clear}
    />
  );
}

export function TabBody({ shell, tab }: { shell: Shell; tab: TabKey }) {
  const { t, app, dispatchApp, climate, history, chat, conversations } = shell;
  const { push, notify: _notify, selectTab } = shell.nav;
  const { fruits, allScans, statuses, capability, readyCount, aiAvailable } = shell.data;

  switch (tab) {
    case 'home':
      return (
        <HomeScreen
          capabilityHeadline={capability.headline}
          capabilityDetail={capability.detail}
          readyModelCount={readyCount}
          totalModelCount={statuses.length}
          fruits={fruits}
          climate={climate.snapshot}
          climateLoading={climate.climate.status === 'loading'}
          onSetLocation={() => push({ name: 'locationPicker' })}
          recentScans={allScans.slice(0, 3)}
          language={app.language}
          onToggleLanguage={() =>
            dispatchApp({ type: 'setLanguage', language: app.language === 'EN' ? 'FIL' : 'EN' })
          }
          onScan={() => push({ name: 'capture' })}
          onOpenFruit={fruitKey => push({ name: 'varietyInfo', fruitKey })}
          onOpenScan={scanId => push({ name: 'result', scanId })}
          onOpenSettings={() => push({ name: 'settings' })}
          onOpenClimate={() => selectTab('climate')}
          onViewAllScans={() => selectTab('history')}
        />
      );
    case 'climate':
      return (
        <ClimateScreen
          climate={climate.snapshot}
          normals={climate.normals}
          suitability={climate.suitabilityFor(app.suitabilityFruit)}
          fruits={fruits}
          selectedFruitKey={app.suitabilityFruit}
          status={climate.climate.status}
          error={climate.climate.error}
          hasLocation={app.savedLocation !== null}
          onSelectFruit={fruitKey => dispatchApp({ type: 'setSuitabilityFruit', fruitKey })}
          onChangeLocation={() => push({ name: 'locationPicker' })}
          onRetry={climate.climate.refresh}
        />
      );
    case 'chat':
      return (
        <ChatScreen
          messages={chat.messages}
          suggestions={preview.CHAT_SUGGESTIONS}
          curatedWording={!app.aiAssistant || !aiAvailable}
          draft={chat.draft}
          pending={chat.pending}
          onChangeDraft={chat.setDraft}
          onSend={chat.send}
          onSuggestion={chat.ask}
          edgeSwipeHandlers={conversations.edgeSwipe.panHandlers}
        />
      );
    case 'history':
      return (
        <HistoryScreen
          groups={history.visibleGroups}
          filters={history.filters}
          activeFilterKey={app.historyFilter}
          query={app.historyQuery}
          totalLabel={t.scansShown(history.visibleCount, allScans.length)}
          onChangeQuery={query => dispatchApp({ type: 'setHistoryQuery', query })}
          onFilter={key => dispatchApp({ type: 'setHistoryFilter', filter: key })}
          onOpenScan={scanId => push({ name: 'result', scanId })}
        />
      );
  }
}
