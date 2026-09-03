import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { BackHandler, View } from 'react-native';
import {
  BottomNav, LanguageProvider, NoticeBar, Screen, ScreenBody, strings,
} from '../ui';
import { appReducer, initialAppState, type AppAction } from '../state/appState';
import { describeDetectionCapability } from '../core/status';
import { openAppDatabase } from '../core/db/appDatabase';
import { hasConsented, recordConsent } from '../core/db/consent';
import { getSyncMode, setSyncMode } from '../core/db/syncMode';
import { listScanGroups } from '../core/db/repositories/scans';
import { listTrashedConversations } from '../core/db/repositories/conversations';
import { getSetting, loadSettings, saveSetting, SETTING_KEYS } from '../core/db/repositories/settings';
import {
  listFruits,
  listAllVarietiesByFruit,
  listSourcesByFruit,
} from '../core/db/repositories/content';
import { bundledModels } from '../core/ml/bundledModels';
import manifest from '../core/ml/manifest.json';
import { pipelineDepth, resolveModels } from '../core/ml/registry';
import { purgeTrash } from '../core/sync/purgeTrash';
import { useAccountSync } from '../features/account/useAccountSync';
import { CameraCapture } from '../features/capture/CameraCapture';
import { useCaptureRoute } from '../features/capture/useCaptureRoute';
import { ConversationSidebar } from '../features/chat/ConversationSidebar';
import { useChatRuntime } from '../features/chat/useChatRuntime';
import { useConversationsUi } from '../features/chat/useConversationsUi';
import { useClimateViews } from '../features/climate/useClimateViews';
import { canGoBack, currentRoute, initialNav, navReducer, Route, TabKey } from './navState';
import { needsOnboarding, OnboardingGate } from './render/onboarding';
import { RouteBar, RouteBody } from './render/routes';
import { TabBar, TabBody, tabItems } from './render/tabs';
import type { Shell } from './shell';
import { useHistoryFilters } from '../features/history/useHistoryFilters';

export function AppNavigator() {
  // Opened once. History is read from here, so what the app shows is what the
  // device actually stored — there is no sample history behind it any more.
  const db = useMemo(() => openAppDatabase(), []);

  // Once per day: sweep conversations past the Trash retention period. Any
  // device may run this — every other device's own sweep or next restore
  // simply finds the row already gone.
  useEffect(() => {
    const last = getSetting(db, SETTING_KEYS.lastPurgeSweep);
    const today = new Date().toISOString().slice(0, 10);
    if (last === today) return;
    void purgeTrash({ db }).finally(() => saveSetting(db, SETTING_KEYS.lastPurgeSweep, today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bumped after a write; it is the only thing that invalidates the read below.
  const [dataVersion, setDataVersion] = useState(0);
  const bumpData = useCallback(() => setDataVersion(v => v + 1), []);

  // Which drill-down row is open. The design has no separate detail screens, so
  // rows that used to carry a dead chevron expand in place instead.
  const [openVariety, setOpenVariety] = useState<string | null>(null);
  const [openCheckpoint, setOpenCheckpoint] = useState<number | null>(null);

  const [nav, dispatch] = useReducer(navReducer, initialNav);
  const [app, dispatchAppOriginal] = useReducer(
    appReducer,
    initialAppState,
    initial => ({ ...initial, ...loadSettings(db) }),
  );

  const dispatchApp = useCallback(
    (action: AppAction) => {
      dispatchAppOriginal(action);
      switch (action.type) {
        case 'setLanguage':
          saveSetting(db, SETTING_KEYS.language, action.language);
          break;
        case 'toggleLocation':
          saveSetting(db, SETTING_KEYS.useLocation, !app.useLocation);
          break;
        case 'setLocation':
          saveSetting(db, SETTING_KEYS.savedLocation, action.location);
          saveSetting(db, SETTING_KEYS.useLocation, true);
          break;
        case 'forgetLocation':
          saveSetting(db, SETTING_KEYS.savedLocation, null);
          saveSetting(db, SETTING_KEYS.useLocation, false);
          break;
        case 'toggleAiAssistant':
          saveSetting(db, SETTING_KEYS.aiAssistant, !app.aiAssistant);
          break;
      }
    },
    [db, app.useLocation, app.aiAssistant],
  );

  // Dynamic fruit content and metadata loaded directly from SQLite
  const fruits = useMemo(() => listFruits(db), [db]);
  const { varieties: varietiesByFruit, strains: strainsByFruit } = useMemo(
    () => listAllVarietiesByFruit(db),
    [db],
  );
  const sourcesByFruit = useMemo(() => listSourcesByFruit(db), [db]);

  // Read once from the database rather than held only in memory, so the
  // disclosure does not reappear on the next launch.
  const [consented, setConsented] = useState(() => hasConsented(db));
  const [syncMode, setSyncModeState] = useState(() => getSyncMode(db));
  // Gates the language-pick screen ahead of Welcome. Unset for both a fresh
  // install and any existing install that predates this screen, so it is
  // shown once to each rather than only to new installs.
  const [languagePicked, setLanguagePicked] = useState(
    () => getSetting(db, SETTING_KEYS.languagePicked) === '1',
  );
  // Set when the account route has been asked for but the disclosure is still
  // owed. Spec 4 requires it at first run *and* again when an offline user
  // later creates an account from Settings; that second moment has no
  // first-run gate behind it, so the request is held here until acknowledged.
  const [accountRequested, setAccountRequested] = useState(false);

  const scanGroups = useMemo(() => listScanGroups(db), [db, dataVersion]);
  const allScans = useMemo(() => scanGroups.flatMap(g => g.scans), [scanGroups]);
  const trashedConversations = useMemo(() => listTrashedConversations(db), [db, dataVersion]);

  const route = currentRoute(nav);
  // Read directly rather than through useT: this component *provides* the
  // context its children consume.
  const t = strings(app.language);

  const push = useCallback((r: Route) => dispatch({ type: 'push', route: r }), []);
  const replace = useCallback((r: Route) => dispatch({ type: 'replace', route: r }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);
  // Straight to the reducer, not through `dispatchApp`: a notice persists
  // nothing, and this keeps the empty dependency array honest. A useReducer
  // dispatch is stable; `dispatchApp` is rebuilt whenever `useLocation` or
  // `aiAssistant` changes, so capturing one here would go stale unseen.
  const notify = useCallback(
    (message: string) => dispatchAppOriginal({ type: 'notify', message }),
    [],
  );

  const accountSync = useAccountSync({
    db, t, notify, push, back, consented, dataVersion,
    bumpData,
    onSyncModeChange: setSyncModeState,
    onAccountRequested: () => setAccountRequested(true),
  });

  // Android hardware back mirrors the in-app back button.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack(nav)) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [nav, back]);

  const statuses = useMemo(() => resolveModels(manifest, bundledModels, {}), []);
  const capability = useMemo(() => describeDetectionCapability(statuses), [statuses]);
  const depth = useMemo(() => pipelineDepth(statuses), [statuses]);
  const readyCount = statuses.filter(s => s.state === 'ready').length;

  // --- climate ---------------------------------------------------------------

  const climateViews = useClimateViews({ savedLocation: app.savedLocation, fruits });

  const { chat, aiAvailable } = useChatRuntime({
    db, notify, app, fruits, varietiesByFruit, strainsByFruit, sourcesByFruit,
    climate: climateViews, capability, depth,
    bumpData,
  });

  const conversations = useConversationsUi({
    db, chat, dataVersion, bumpData,
  });

  // --- history ---------------------------------------------------------------

  const history = useHistoryFilters({
    scanGroups, allScans, historyFilter: app.historyFilter, historyQuery: app.historyQuery, t,
  });

  const capture = useCaptureRoute({
    db,
    savedLocation: app.savedLocation,
    bumpData,
    replace,
  });

  const shell: Shell = {
    t,
    nav: {
      push, replace, back, notify,
      selectTab: tab => dispatch({ type: 'selectTab', tab }),
      openVariety, setOpenVariety,
      openCheckpoint, setOpenCheckpoint,
    },
    data: {
      db, fruits, varietiesByFruit, strainsByFruit, sourcesByFruit,
      scanGroups, allScans, trashedConversations,
      statuses, capability, depth, readyCount,
      aiAvailable,
      bumpData,
    },
    app,
    dispatchApp,
    climate: climateViews,
    history,
    account: accountSync,
    chat,
    conversations,
  };

  const gate = (
    <OnboardingGate
      language={app.language}
      languagePicked={languagePicked}
      syncMode={syncMode}
      consented={consented}
      accountRequested={accountRequested}
      onPickLanguage={language => {
        dispatchApp({ type: 'setLanguage', language });
        saveSetting(db, SETTING_KEYS.languagePicked, '1');
        setLanguagePicked(true);
      }}
      onChooseOffline={() => { setSyncMode(db, 'offline'); setSyncModeState('offline'); }}
      onChooseAccount={() => {
        setSyncMode(db, 'account');
        setSyncModeState('account');
        // The consent screen pushes the account route itself on acknowledge.
        // On an install that already consented under the old first-run flow
        // that screen never renders, so nothing would push and the button
        // would look dead.
        if (consented) push({ name: 'account' });
      }}
      onAcknowledgeConsent={() => {
        recordConsent(db, new Date().toISOString());
        setConsented(true);
        setAccountRequested(false);
        push({ name: 'account' });
      }}
    />
  );
  if (needsOnboarding({ languagePicked, syncMode, consented, accountRequested })) {
    return gate;
  }

  // --- the camera is full-bleed: no app bar, no bottom navigation ------------

  if (route?.name === 'capture') {
    return (
      <CameraCapture onClose={back} onCaptured={capture.onCaptured} onError={notify} />
    );
  }

  const body = route
    ? <RouteBody shell={shell} route={route} />
    : <TabBody shell={shell} tab={nav.tab} />;
  const bar = route
    ? <RouteBar shell={shell} route={route} />
    : <TabBar shell={shell} tab={nav.tab} />;
  const chatTabActive = nav.tab === 'chat' && !route;

  return (
    <LanguageProvider language={app.language}>
    <Screen>
      {bar}
      {chatTabActive ? (
        <View style={{ flex: 1 }} {...conversations.edgeSwipe.panHandlers}>
          {body}
        </View>
      ) : (
        <ScreenBody>{body}</ScreenBody>
      )}
      {app.notice ? (
        <NoticeBar
          message={app.notice}
          onDismiss={() => dispatchApp({ type: 'dismissNotice' })}
        />
      ) : null}
      <BottomNav
        tabs={tabItems(t)}
        active={nav.tab}
        onSelect={key => conversations.selectTab(key as TabKey, tab => dispatch({ type: 'selectTab', tab }))}
        onScan={() => push({ name: 'capture' })}
      />
      <ConversationSidebar
        visible={conversations.sidebarOpen}
        conversations={conversations.list}
        activeId={chat.conversationId}
        onSelect={uuid => chat.openConversation(uuid)}
        onNew={() => chat.startNewConversation()}
        onClose={conversations.closeSidebar}
        onRename={conversations.rename}
        onDelete={conversations.remove}
      />
    </Screen>
    </LanguageProvider>
  );
}
