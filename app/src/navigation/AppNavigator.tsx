import React, { useCallback, useEffect, useReducer } from 'react';
import { BackHandler } from 'react-native';
import { AppBar, BottomNav, Screen, ScreenBody, TabItem } from '../ui';
import { describeDetectionCapability } from '../core/status';
import { bundledModels } from '../core/ml/bundledModels';
import manifest from '../core/ml/manifest.json';
import { resolveModels } from '../core/ml/registry';
import { CaptureScreen } from '../features/capture/CaptureScreen';
import { ChatScreen } from '../features/chat/ChatScreen';
import { ClimateScreen } from '../features/climate/ClimateScreen';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { ModelStatusScreen } from '../features/modelStatus/ModelStatusScreen';
import { MonitoringScreen } from '../features/monitoring/MonitoringScreen';
import { ResultScreen } from '../features/result/ResultScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { VarietyInfoScreen } from '../features/varietyInfo/VarietyInfoScreen';
import * as preview from '../preview/previewContent';
import { canGoBack, currentRoute, initialNav, navReducer, Route, TabKey } from './navState';

const TABS: TabItem[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'climate', label: 'Climate', icon: 'cloud' },
  { key: 'chat', label: 'Chat', icon: 'chat' },
  { key: 'history', label: 'History', icon: 'history' },
];

const TAB_TITLE: Record<TabKey, string> = {
  home: 'PrutasAI',
  climate: 'Climate',
  chat: 'Assistant',
  history: 'History',
};

function routeTitle(route: Route): string {
  switch (route.name) {
    case 'capture':
      return 'Scan a fruit';
    case 'result':
      return 'Result';
    // Titled from the route so opening Banana does not read "Mango".
    case 'varietyInfo':
      return preview.FRUITS.find(f => f.key === route.fruitKey)?.nameEn ?? 'Fruit';
    case 'monitoring':
      return 'Monitoring';
    case 'settings':
      return 'Settings';
    case 'modelStatus':
      return 'Model status';
  }
}

export function AppNavigator() {
  const [nav, dispatch] = useReducer(navReducer, initialNav);
  const route = currentRoute(nav);

  const push = useCallback((r: Route) => dispatch({ type: 'push', route: r }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);

  // Android hardware back mirrors the in-app back button.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack(nav)) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [nav, back]);

  const statuses = resolveModels(manifest, bundledModels, {});
  const capability = describeDetectionCapability(statuses);
  const readyCount = statuses.filter(s => s.state === 'ready').length;

  // The camera is full-bleed: no app bar, no bottom navigation.
  if (route?.name === 'capture') {
    return (
      <CaptureScreen
        onClose={back}
        onCapture={() => {
          back();
          push({ name: 'result', scanId: 'preview' });
        }}
        onPickImage={() => {}}
        onFlip={() => {}}
      />
    );
  }

  const body = route ? renderRoute(route) : renderTab(nav.tab);

  return (
    <Screen>
      {route ? (
        <AppBar
          title={routeTitle(route)}
          onBack={back}
          action={route.name === 'modelStatus' ? 'refresh' : undefined}
        />
      ) : nav.tab === 'home' ? null : (
        <AppBar
          title={TAB_TITLE[nav.tab]}
          subtitle={nav.tab === 'chat' ? 'Grounded in your knowledge base' : undefined}
          action={nav.tab === 'history' ? 'search' : nav.tab === 'climate' ? 'refresh' : undefined}
        />
      )}

      {nav.tab === 'chat' && !route ? body : <ScreenBody>{body}</ScreenBody>}

      <BottomNav
        tabs={TABS}
        active={nav.tab}
        onSelect={key => dispatch({ type: 'selectTab', tab: key as TabKey })}
        onScan={() => push({ name: 'capture' })}
      />
    </Screen>
  );

  function renderTab(tab: TabKey) {
    switch (tab) {
      case 'home':
        return (
          <HomeScreen
            capabilityHeadline={capability.headline}
            capabilityDetail={capability.detail}
            readyModelCount={readyCount}
            totalModelCount={statuses.length}
            fruits={preview.FRUITS}
            climate={preview.CLIMATE}
            recentScans={preview.RECENT_SCANS}
            onScan={() => push({ name: 'capture' })}
            onOpenFruit={fruitKey => push({ name: 'varietyInfo', fruitKey })}
            onOpenScan={scanId => push({ name: 'result', scanId })}
            onOpenSettings={() => push({ name: 'settings' })}
            onOpenClimate={() => dispatch({ type: 'selectTab', tab: 'climate' })}
            onViewAllScans={() => dispatch({ type: 'selectTab', tab: 'history' })}
          />
        );
      case 'climate':
        return (
          <ClimateScreen
            climate={preview.CLIMATE}
            normals={preview.NORMALS}
            suitability={preview.SUITABILITY}
            onChangeLocation={() => {}}
          />
        );
      case 'chat':
        return (
          <ChatScreen
            messages={preview.CHAT}
            verdict={preview.SUITABILITY}
            suggestions={preview.CHAT_SUGGESTIONS}
            offline
            onSend={() => {}}
            onSuggestion={() => {}}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            groups={preview.SCAN_GROUPS}
            filters={['All · 6', '🍌 Banana', '🥭 Mango', '🫒 Papaya', 'Diseased']}
            activeFilter="All · 6"
            totalLabel="6 scans stored on this device · never uploaded"
            onFilter={() => {}}
            onOpenScan={scanId => push({ name: 'result', scanId })}
          />
        );
    }
  }

  function renderRoute(r: Route) {
    switch (r.name) {
      case 'result':
        return (
          <ResultScreen
            result={preview.RESULT}
            onStartMonitoring={() => push({ name: 'monitoring', sessionId: 'preview' })}
            onAskAssistant={() => dispatch({ type: 'selectTab', tab: 'chat' })}
          />
        );
      case 'varietyInfo': {
        const fruit = preview.FRUITS.find(f => f.key === r.fruitKey) ?? preview.FRUITS[0];
        return (
          <VarietyInfoScreen
            fruit={fruit}
            modelVarieties={preview.VARIETIES_BY_FRUIT[fruit.key] ?? []}
            informationOnly={preview.STRAINS_BY_FRUIT[fruit.key] ?? []}
            requirementsVerified={false}
            requirements={[
              { label: 'Temperature', value: '24–30 °C', icon: 'thermometer' },
              { label: 'Annual rainfall', value: '1,000–2,000 mm', icon: 'cloudRain' },
              { label: 'Elevation', value: 'below 600 m', icon: 'mountain' },
            ]}
            sources={preview.SOURCES_BY_FRUIT[fruit.key] ?? []}
            onOpenVariety={() => {}}
          />
        );
      }
      case 'monitoring':
        return (
          <MonitoringScreen
            session={preview.SESSION}
            onScanCheckpoint={() => push({ name: 'capture' })}
            onOpenCheckpoint={() => {}}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            language="EN"
            useLocation
            savedLocationLabel="14.17, 121.24 — rounded to ~1.1 km"
            climateProvider="Open-Meteo · no API key needed"
            normalsFetchedLabel="Last fetched 12 Jun 2026 · every 90 days"
            onlinePhrasing={false}
            onlinePhrasingDetail="No API key set — answers use curated wording"
            contentVersion="2026.08.10"
            modelsLabel={`${readyCount} of ${statuses.length} installed`}
            historyLabel="6 scans · 14 MB on this device"
            onChangeLanguage={() => {}}
            onToggleLocation={() => {}}
            onForgetLocation={() => {}}
            onRefreshNormals={() => {}}
            onToggleOnlinePhrasing={() => {}}
            onOpenModels={() => push({ name: 'modelStatus' })}
            onOpenHistory={() => dispatch({ type: 'selectTab', tab: 'history' })}
          />
        );
      case 'modelStatus':
        return <ModelStatusScreen />;
      case 'capture':
        return null;
    }
  }
}
