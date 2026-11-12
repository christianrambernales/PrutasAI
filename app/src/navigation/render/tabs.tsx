import React from 'react';
import { TabItem } from '../../ui';
import { ChatScreen } from '../../features/chat/ChatScreen';
import { MonitoringListScreen } from '../../features/monitoring/MonitoringListScreen';
import { RouteBody } from './routes';
import { HomeScreen } from '../../features/home/HomeScreen';
import * as preview from '../../preview/previewContent';
import type { TabKey } from '../navState';
import type { Shell } from '../shell';

type Strings = Shell['t'];

/** The four bottom-navigation entries. AppNavigator renders the bar itself. */
export function tabItems(t: Strings): TabItem[] {
  return [
    { key: 'home', label: t.tabHome, icon: 'home' },
    { key: 'monitoring', label: t.tabMonitoring, icon: 'monitoring' },
    { key: 'chat', label: t.tabAssistant, icon: 'chat' },
    { key: 'account', label: t.tabAccount, icon: 'account' },
  ];
}

export function TabBar(_props: { shell: Shell; tab: TabKey }) {
  return null;
}

export function TabBody({ shell, tab }: { shell: Shell; tab: TabKey }) {
  const { t, app, dispatchApp, climate, chat, conversations, monitoringList } = shell;
  const { push, notify: _notify, selectTab } = shell.nav;
  const { fruits, allScans, statuses, readyCount, aiAvailable } = shell.data;

  switch (tab) {
    case 'home': {
      const firstMonitoring = monitoringList.rows[0];
      return (
        <HomeScreen
          capabilityHeadline={readyCount > 0 ? t.modelStatusValidatedHeadline : t.modelStatusEmptyHeadline}
          capabilityDetail={t.modelInferenceUnverified}
          readyModelCount={readyCount}
          totalModelCount={statuses.length}
          fruits={fruits}
          climate={climate.snapshot}
          climateLoading={climate.climate.status === 'loading'}
          onSetLocation={() => push({ name: 'locationPicker' })}
          recentScans={allScans.slice(0, 1)}
          activeMonitoring={
            firstMonitoring
              ? {
                  id: firstMonitoring.id,
                  crop: firstMonitoring.source.fruitKey ?? undefined,
                  title: firstMonitoring.source.title,
                  emoji: firstMonitoring.source.emoji,
                }
              : undefined
          }
          language={app.language}
          onToggleLanguage={() =>
            dispatchApp({ type: 'setLanguage', language: app.language === 'EN' ? 'FIL' : 'EN' })
          }
          onScan={() => push({ name: 'capture' })}
          onOpenFruit={fruitKey => push({ name: 'varietyInfo', fruitKey })}
          onOpenScan={scanId =>
            scanId === 'demo-sample'
              ? push({ name: 'result', scanId: 'demo-sample' })
              : push({ name: 'result', scanId })
          }
          onOpenSettings={() => push({ name: 'settings' })}
          onOpenClimate={() => push({ name: 'climate' })}
          onViewAllScans={() => push({ name: 'history' })}
          onOpenChat={() => selectTab('chat')}
          onOpenMonitoring={() => selectTab('monitoring')}
        />
      );
    }
    case 'monitoring':
      return (
        <MonitoringListScreen
          rows={monitoringList.rows}
          loading={monitoringList.loading}
          error={monitoringList.error}
          onRetry={() => void monitoringList.reload()}
          onOpen={sourceScanId => push({ name: 'monitoring', sessionId: sourceScanId })}
          onScan={() => push({ name: 'capture' })}
          onOpenHistory={() => push({ name: 'history' })}
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
          onRetry={chat.retry}
          edgeSwipeHandlers={conversations.edgeSwipe.panHandlers}
          onOpenConversations={conversations.openSidebar}
          onNewConversation={chat.clear}
        />
      );
    case 'account':
      return <RouteBody shell={shell} route={{ name: 'account' }} />;
  }
}
