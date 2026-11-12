import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppBar, AppText, COLORS, TabItem } from '../../ui';
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

function tabTitle(t: Strings): Record<TabKey, string> {
  return {
    home: 'PrutasAI',
    monitoring: t.titleMonitoring,
    chat: t.titleAssistant,
    account: t.titleAccount,
  };
}

export function TabBar({ shell, tab }: { shell: Shell; tab: TabKey }) {
  const { t, app, chat, conversations } = shell;
  const TAB_TITLE = tabTitle(t);
  const conversationsAction = React.useRef<any>(null);

  if (tab === 'home') return null;
  if (tab === 'monitoring') {
    return (
      <AppBar
        title={TAB_TITLE.monitoring}
      />
    );
  }
  if (tab === 'account') {
    return (
      <AppBar
        title={TAB_TITLE.account}
        action="gear"
        actionLabel={t.titleSettings}
        onAction={() => shell.nav.push({ name: 'settings' })}
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
      right={(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.openConversations}
          ref={conversationsAction}
          onPress={() => conversations.openSidebar(conversationsAction.current)}
          style={styles.conversationsAction}
        >
          <AppText variant="xsSemi" color={COLORS.surface}>{t.chatConversations}</AppText>
        </Pressable>
      )}
      action="trash"
      actionLabel={t.clearConversation}
      onAction={chat.clear}
    />
  );
}

export function TabBody({ shell, tab }: { shell: Shell; tab: TabKey }) {
  const { t, app, dispatchApp, climate, chat, conversations, monitoringList } = shell;
  const { push, notify: _notify, selectTab } = shell.nav;
  const { fruits, allScans, statuses, readyCount, aiAvailable } = shell.data;

  switch (tab) {
    case 'home':
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
          recentScans={allScans.slice(0, 3)}
          language={app.language}
          onToggleLanguage={() =>
            dispatchApp({ type: 'setLanguage', language: app.language === 'EN' ? 'FIL' : 'EN' })
          }
          onScan={() => push({ name: 'capture' })}
          onOpenFruit={fruitKey => push({ name: 'varietyInfo', fruitKey })}
          onOpenScan={scanId => push({ name: 'result', scanId })}
          onOpenSettings={() => push({ name: 'settings' })}
          onOpenClimate={() => push({ name: 'climate' })}
          onViewAllScans={() => push({ name: 'history' })}
          onOpenChat={() => selectTab('chat')}
          onOpenMonitoring={() => selectTab('monitoring')}
        />
      );
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

const styles = StyleSheet.create({
  conversationsAction: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
