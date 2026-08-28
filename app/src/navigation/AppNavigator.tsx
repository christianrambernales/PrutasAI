import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { BackHandler } from 'react-native';
import {
  AppBar, BottomNav, LanguageProvider, NoticeBar, Screen, ScreenBody, strings, TabItem,
} from '../ui';
import { appReducer, initialAppState, type AppAction } from '../state/appState';
import { describeDetectionCapability } from '../core/status';
import { CONTENT_VERSION, openAppDatabase } from '../core/db/appDatabase';
import { hasConsented, recordConsent } from '../core/db/consent';
import { findScan, insertScan, listScanGroups, newScanUuid } from '../core/db/repositories/scans';
import { loadSettings, saveSetting, SETTING_KEYS } from '../core/db/repositories/settings';
import {
  listFruits,
  listAllVarietiesByFruit,
  listSourcesByFruit,
} from '../core/db/repositories/content';
import { bundledModels } from '../core/ml/bundledModels';
import manifest from '../core/ml/manifest.json';
import { pipelineDepth, resolveModels } from '../core/ml/registry';
import type { ChatContext } from '../core/chat/answer';
import { deviceId } from '../core/chat/deviceId';
import { drainScans } from '../core/sync/drain';
import { createProxyProvider } from '../core/chat/providers/proxy';
import { templateProvider } from '../core/chat/providers/template';
import { currentUser, signIn, signOut, signUp } from '../core/auth/session';
import { claimAndRestore } from '../core/auth/restore';
import { AccountScreen } from '../features/account/AccountScreen';
import { CameraCapture } from '../features/capture/CameraCapture';
import { ChatScreen } from '../features/chat/ChatScreen';
import { ConsentScreen } from '../features/consent/ConsentScreen';
import { useChat } from '../features/chat/useChat';
import { ClimateScreen } from '../features/climate/ClimateScreen';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { LocationPickerScreen } from '../features/location/LocationPickerScreen';
import { ModelStatusScreen } from '../features/modelStatus/ModelStatusScreen';
import { MonitoringScreen } from '../features/monitoring/MonitoringScreen';
import { CaptureResultScreen } from '../features/result/CaptureResultScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { VarietyInfoScreen } from '../features/varietyInfo/VarietyInfoScreen';
import { relativeTime, useClimate } from '../features/climate/useClimate';
import { judgeSuitability } from '../core/climate/suitability';
import type {
  ClimateNormals, ClimateSnapshot, FruitSummary, ScanGroup, ScanSummary, Suitability,
} from '../features/viewModels';
import * as preview from '../preview/previewContent';
import { canGoBack, currentRoute, initialNav, navReducer, Route, TabKey } from './navState';

const DISEASED = ['early', 'moderate', 'severe'];

/**
 * History filters are keyed independently of their labels, so a translated
 * label ("May sakit") still selects the same scans as the English one.
 */
const FILTER_KEYS = ['All', 'Banana', 'Mango', 'Papaya', 'Diseased'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

function matchesFilter(scan: ScanSummary, key: string): boolean {
  if (key === 'All') return true;
  if (key === 'Diseased') return DISEASED.includes(scan.status);
  return scan.title.toLowerCase().startsWith(key.toLowerCase());
}

function matchesQuery(scan: ScanSummary, query: string): boolean {
  if (query.trim() === '') return true;
  return `${scan.title} ${scan.detail}`.toLowerCase().includes(query.trim().toLowerCase());
}

type Strings = ReturnType<typeof strings>;

function routeTitle(route: Route, t: Strings, fruits: FruitSummary[]): string {
  switch (route.name) {
    case 'capture':
      return t.titleCapture;
    case 'captureResult':
      return t.titleScan;
    case 'result':
      return t.titleResult;
    // Titled from the route so opening Banana does not read "Mango".
    case 'varietyInfo':
      return fruits.find(f => f.key === route.fruitKey)?.nameEn ?? 'Fruit';
    case 'monitoring':
      return t.titleMonitoring;
    case 'settings':
      return t.titleSettings;
    case 'modelStatus':
      return t.titleModelStatus;
    case 'locationPicker':
      return t.titleLocationPicker;
    case 'account':
      return t.titleAccount;
  }
}

export function AppNavigator() {
  // Opened once. History is read from here, so what the app shows is what the
  // device actually stored — there is no sample history behind it any more.
  const db = useMemo(() => openAppDatabase(), []);
  // Bumped after a write; it is the only thing that invalidates the read below.
  const [dataVersion, setDataVersion] = useState(0);

  // Which drill-down row is open. The design has no separate detail screens, so
  // rows that used to carry a dead chevron expand in place instead.
  const [openVariety, setOpenVariety] = useState<string | null>(null);
  const [openCheckpoint, setOpenCheckpoint] = useState<number | null>(null);

  const [account, setAccount] = useState<{ email: string | null; busy: boolean; error: string | null }>(
    { email: null, busy: false, error: null },
  );

  // Read once on mount: a session in secure storage survived the last launch.
  useEffect(() => {
    void currentUser().then(user => {
      if (user) setAccount(a => ({ ...a, email: user.email }));
    });
  }, []);

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

  // Fire-and-forget. Nothing on screen waits for this, and a failure leaves the
  // rows queued for the next launch.
  useEffect(() => {
    void drainScans({
      db,
      baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
      deviceId: deviceId(db),
    });
  }, [db, dataVersion]);

  const scanGroups = useMemo(() => listScanGroups(db), [db, dataVersion]);
  const allScans = useMemo(() => scanGroups.flatMap(g => g.scans), [scanGroups]);

  const route = currentRoute(nav);
  // Read directly rather than through useT: this component *provides* the
  // context its children consume.
  const t = strings(app.language);

  const TABS: TabItem[] = [
    { key: 'home', label: t.tabHome, icon: 'home' },
    { key: 'climate', label: t.tabClimate, icon: 'cloud' },
    { key: 'chat', label: t.tabChat, icon: 'chat' },
    { key: 'history', label: t.tabHistory, icon: 'history' },
  ];

  const TAB_TITLE: Record<TabKey, string> = {
    home: 'PrutasAI',
    climate: t.tabClimate,
    chat: t.titleAssistant,
    history: t.tabHistory,
  };

  const push = useCallback((r: Route) => dispatch({ type: 'push', route: r }), []);
  const replace = useCallback((r: Route) => dispatch({ type: 'replace', route: r }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);
  const notify = useCallback(
    (message: string) => dispatchApp({ type: 'notify', message }),
    [],
  );

  // Claim this device's anonymous rows, then restore the account's history —
  // in that order, since a failed claim must never trigger a restore and
  // leave history half-attached. Shared by sign-in and sign-up: a new account
  // has nothing to restore but everything on this device to claim.
  const claimAndRestoreForAccount = useCallback(
    async (email: string, outcome: { accessToken: string }) => {
      const report = await claimAndRestore({
        db,
        baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
        deviceId: deviceId(db),
        accessToken: outcome.accessToken,
      });

      setAccount({ email, busy: false, error: null });
      // Invalidate the history read so restored scans appear without a relaunch.
      setDataVersion(v => v + 1);
      if (report.restoreFailed) notify(t.historyRestoreFailed);
      else if (report.restored > 0) notify(t.historyRestored(report.restored));
      else if (report.claimed) notify(t.historyClaimed);
    },
    [db, t, notify],
  );

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setAccount(a => ({ ...a, busy: true, error: null }));
    const outcome = await signIn(email, password);

    if (!outcome.ok) {
      setAccount({ email: null, busy: false, error: outcome.error });
      return;
    }

    await claimAndRestoreForAccount(email, outcome);
  }, [claimAndRestoreForAccount]);

  const handleSignUp = useCallback(async (email: string, password: string) => {
    setAccount(a => ({ ...a, busy: true, error: null }));
    const outcome = await signUp(email, password);

    if (!outcome.ok) {
      setAccount({ email: null, busy: false, error: outcome.error });
      return;
    }

    await claimAndRestoreForAccount(email, outcome);
  }, [claimAndRestoreForAccount]);

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

  const climate = useClimate(app.savedLocation);

  const climateSnapshot: ClimateSnapshot | null = useMemo(() => {
    const current = climate.current;
    if (!current || !app.savedLocation) return null;
    const age = relativeTime(climate.fetchedAt);
    return {
      place: app.savedLocation.label,
      coordsLabel: `${app.savedLocation.latitude.toFixed(2)}, ${app.savedLocation.longitude.toFixed(2)} · rounded to 2 dp`,
      freshness: climate.status === 'error' ? 'stale' : 'live',
      freshnessLabel: climate.status === 'error' ? `Stale · ${age}` : `Updated ${age}`,
      temperatureC: Math.round(current.temperatureC),
      condition: current.condition,
      feelsLikeLabel: `Feels like ${Math.round(current.apparentTemperatureC)}°`,
      humidityPct: Math.round(current.humidityPct),
      rainTodayMm: current.precipitationMm,
      elevationM: current.elevationM,
    };
  }, [climate.current, climate.fetchedAt, climate.status, app.savedLocation]);

  const normalsView: ClimateNormals | null = useMemo(() => {
    const n = climate.normals;
    if (!n) return null;
    return {
      monthlyRainMm: n.monthlyRainMm,
      annualRainMm: n.annualRainMm,
      meanTemperatureC: n.meanTemperatureC,
      fetchedLabel: `${n.fromYear}–${n.toYear} mean`,
    };
  }, [climate.normals]);

  /**
   * The verdict is computed from real normals, never from today's reading.
   * Returns null only when the fruit has no requirement row — a missing-normals
   * failure is reported separately so the two are never confused.
   */
  const suitabilityFor = useCallback(
    (fruitKey: string): Suitability | null => {
      const judged = judgeSuitability({
        fruitKey,
        normals: climate.normals,
        elevationM: climate.current?.elevationM ?? null,
      });
      if (judged.verdict === 'insufficient_data') return null;
      const fruit = fruits.find(f => f.key === fruitKey);
      return {
        fruitEmoji: fruit?.emoji ?? '',
        fruitName: fruit?.nameEn ?? fruitKey,
        verdict: judged.verdict,
        headline: judged.headline,
        detail: judged.detail,
        evidence: judged.evidence,
        basisLabel: judged.basisLabel,
        sourceLabel: judged.sourceLabel,
      };
    },
    [climate.normals, climate.current, fruits],
  );

  // Only a public URL ships. The model credential lives as a Vercel Function's
  // environment variable, so there is nothing in the bundle worth extracting.
  //
  // onDiagnostic surfaces outages and rejected requests as a notice. Without it
  // a failure on every request is indistinguishable from "the rewording
  // happened to change nothing", which is exactly how a broken model once hid.
  const proxyProvider = useMemo(
    () =>
      createProxyProvider({
        baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
        deviceId: deviceId(db),
        onDiagnostic: notify,
      }),
    [db, notify],
  );
  const provider = app.aiAssistant ? proxyProvider : templateProvider;

  const chatContext: ChatContext = useMemo(
    () => ({
      language: app.language,
      fruits,
      varietiesByFruit,
      strainsByFruit,
      sourcesByFruit,
      climate: climateSnapshot,
      climateReady: climate.normals !== null,
      suitabilityFor,
      location: app.savedLocation,
      detection: { headline: capability.headline, detail: capability.detail, depth },
    }),
    [
      app.language,
      app.savedLocation,
      capability,
      depth,
      suitabilityFor,
      climateSnapshot,
      climate.normals,
      fruits,
      varietiesByFruit,
      strainsByFruit,
      sourcesByFruit,
    ],
  );

  const chat = useChat(chatContext, provider);

  const savedLocationLabel = app.savedLocation
    ? `${app.savedLocation.label} · ${app.savedLocation.latitude.toFixed(2)}, ${app.savedLocation.longitude.toFixed(2)}`
    : 'No location saved';

  // --- history ---------------------------------------------------------------

  const filters = useMemo(() => {
    const label: Record<FilterKey, string> = {
      All: t.filterAll,
      Banana: 'Banana',
      Mango: 'Mango',
      Papaya: 'Papaya',
      Diseased: t.filterDiseased,
    };
    return FILTER_KEYS.map(key => ({
      key,
      label: `${label[key]} · ${allScans.filter(s => matchesFilter(s, key)).length}`,
    }));
  }, [allScans, t]);

  const visibleGroups: ScanGroup[] = useMemo(
    () =>
      scanGroups.map(group => ({
        label: group.label,
        scans: group.scans.filter(
          s => matchesFilter(s, app.historyFilter) && matchesQuery(s, app.historyQuery ?? ''),
        ),
      })),
    [scanGroups, app.historyFilter, app.historyQuery],
  );

  const visibleCount = visibleGroups.reduce((n, g) => n + g.scans.length, 0);

  // Shown once, before anything else — including the camera route, which a
  // fresh install cannot have navigated to yet.
  if (!consented) {
    return (
      <LanguageProvider language={app.language}>
        <Screen>
          <ScreenBody>
            <ConsentScreen
              onAcknowledge={() => {
                recordConsent(db, new Date().toISOString());
                setConsented(true);
              }}
            />
          </ScreenBody>
        </Screen>
      </LanguageProvider>
    );
  }

  // --- the camera is full-bleed: no app bar, no bottom navigation ------------

  if (route?.name === 'capture') {
    return (
      <CameraCapture
        onClose={back}
        onCaptured={uri => {
          insertScan(db, {
            uuid: newScanUuid(),
            imageUri: uri,
            createdAt: new Date().toISOString(),
            // No weights are installed, so nothing was inferred and nothing is
            // claimed. The row records the photo and the time, and that is all.
            fruitKey: null, fruitConf: null, varietyKey: null, varietyConf: null,
            bboxJson: null, manifestVersion: manifest.manifest_version,
            // The scan records where it was taken, if the user has set a place.
            // Already rounded to 2 dp in app state; the server rounds again.
            lat: app.savedLocation?.latitude ?? null,
            lon: app.savedLocation?.longitude ?? null,
          });
          setDataVersion(v => v + 1);
          replace({ name: 'captureResult', photoUri: uri });
        }}
        onError={notify}
      />
    );
  }

  const body = route ? renderRoute(route) : renderTab(nav.tab);
  const bar = route ? routeBar(route) : tabBar(nav.tab);

  return (
    <LanguageProvider language={app.language}>
    <Screen>
      {bar}
      {nav.tab === 'chat' && !route ? body : <ScreenBody>{body}</ScreenBody>}
      {app.notice ? (
        <NoticeBar
          message={app.notice}
          onDismiss={() => dispatchApp({ type: 'dismissNotice' })}
        />
      ) : null}
      <BottomNav
        tabs={TABS}
        active={nav.tab}
        onSelect={key => dispatch({ type: 'selectTab', tab: key as TabKey })}
        onScan={() => push({ name: 'capture' })}
      />
    </Screen>
    </LanguageProvider>
  );

  function routeBar(r: Route) {
    if (r.name === 'modelStatus') {
      return (
        <AppBar
          title={routeTitle(r, t, fruits)}
          onBack={back}
          action="refresh"
          actionLabel={t.rereadRegistry}
          onAction={() =>
            notify(
              `Registry re-read · ${readyCount} of ${statuses.length} models installed.`,
            )
          }
        />
      );
    }
    return <AppBar title={routeTitle(r, t, fruits)} onBack={back} />;
  }

  function tabBar(tab: TabKey) {
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
            climate.refresh();
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
          app.aiAssistant && proxyProvider.isAvailable()
            ? t.onlineSubtitle
            : t.groundedSubtitle
        }
        action="trash"
        actionLabel={t.clearConversation}
        onAction={chat.clear}
      />
    );
  }

  function renderTab(tab: TabKey) {
    switch (tab) {
      case 'home':
        return (
          <HomeScreen
            capabilityHeadline={capability.headline}
            capabilityDetail={capability.detail}
            readyModelCount={readyCount}
            totalModelCount={statuses.length}
            fruits={fruits}
            climate={climateSnapshot}
            climateLoading={climate.status === 'loading'}
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
            onOpenClimate={() => dispatch({ type: 'selectTab', tab: 'climate' })}
            onViewAllScans={() => dispatch({ type: 'selectTab', tab: 'history' })}
          />
        );
      case 'climate':
        return (
          <ClimateScreen
            climate={climateSnapshot}
            normals={normalsView}
            suitability={suitabilityFor(app.suitabilityFruit)}
            fruits={fruits}
            selectedFruitKey={app.suitabilityFruit}
            status={climate.status}
            error={climate.error}
            hasLocation={app.savedLocation !== null}
            onSelectFruit={fruitKey => dispatchApp({ type: 'setSuitabilityFruit', fruitKey })}
            onChangeLocation={() => push({ name: 'locationPicker' })}
            onRetry={climate.refresh}
          />
        );
      case 'chat':
        return (
          <ChatScreen
            messages={chat.messages}
            suggestions={preview.CHAT_SUGGESTIONS}
            curatedWording={!app.aiAssistant || !proxyProvider.isAvailable()}
            draft={chat.draft}
            pending={chat.pending}
            onChangeDraft={chat.setDraft}
            onSend={chat.send}
            onSuggestion={chat.ask}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            groups={visibleGroups}
            filters={filters}
            activeFilterKey={app.historyFilter}
            query={app.historyQuery}
            totalLabel={t.scansShown(visibleCount, allScans.length)}
            onChangeQuery={query => dispatchApp({ type: 'setHistoryQuery', query })}
            onFilter={key => dispatchApp({ type: 'setHistoryFilter', filter: key })}
            onOpenScan={scanId => push({ name: 'result', scanId })}
          />
        );
    }
  }

  function renderRoute(r: Route) {
    switch (r.name) {
      case 'captureResult':
        return (
          <CaptureResultScreen
            photoUri={r.photoUri}
            capabilityHeadline={capability.headline}
            capabilityDetail={capability.detail}
            depth={depth}
            onOpenModelStatus={() => push({ name: 'modelStatus' })}
            onScanAgain={() => replace({ name: 'capture' })}
          />
        );
      case 'result': {
        // A stored scan holds a photo, a time and whatever the pipeline
        // recorded — which today is nothing, because no weights are installed.
        // So reopening one shows the same honest state a fresh capture shows.
        // It must never fall back to the design preview: that is how a
        // fabricated diagnosis reached a screen once already.
        const stored = findScan(db, r.scanId);
        return (
          <CaptureResultScreen
            photoUri={stored?.imageUri ?? ''}
            capabilityHeadline={capability.headline}
            capabilityDetail={capability.detail}
            depth={depth}
            record={
              stored
                ? { title: stored.title, detail: stored.detail, timeLabel: stored.timeLabel }
                : {
                    title: 'Scan not found',
                    detail: 'This scan is no longer stored on this device.',
                    timeLabel: '',
                  }
            }
            onOpenModelStatus={() => push({ name: 'modelStatus' })}
            onScanAgain={() => replace({ name: 'capture' })}
          />
        );
      }
      case 'varietyInfo': {
        const fruit = fruits.find(f => f.key === r.fruitKey) ?? fruits[0];
        return (
          <VarietyInfoScreen
            fruit={fruit}
            modelVarieties={varietiesByFruit[fruit.key] ?? []}
            informationOnly={strainsByFruit[fruit.key] ?? []}
            requirementsVerified={false}
            requirements={[
              { label: 'Temperature', value: '24–30 °C', icon: 'thermometer' },
              { label: 'Annual rainfall', value: '1,000–2,000 mm', icon: 'cloudRain' },
              { label: 'Elevation', value: 'below 600 m', icon: 'mountain' },
            ]}
            sources={sourcesByFruit[fruit.key] ?? []}
            expandedVarietyKey={openVariety}
            onOpenVariety={key => setOpenVariety(current => (current === key ? null : key))}
          />
        );
      }
      case 'monitoring': {
        const session = preview.sessionForScan(r.sessionId) ?? preview.SESSION;
        return (
          <MonitoringScreen
            session={session}
            expandedCheckpointDay={openCheckpoint}
            onScanCheckpoint={() => push({ name: 'capture' })}
            onOpenCheckpoint={day => setOpenCheckpoint(current => (current === day ? null : day))}
          />
        );
      }
      case 'settings':
        return (
          <SettingsScreen
            language={app.language}
            useLocation={app.useLocation}
            savedLocationLabel={savedLocationLabel}
            climateProvider="Open-Meteo · no API key needed"
            normalsFetchedLabel={
              climate.normals
                ? `${climate.normals.fromYear}–${climate.normals.toYear} normals · fetched ${relativeTime(climate.fetchedAt)}`
                : 'Not fetched yet'
            }
            aiAssistant={app.aiAssistant}
            aiAssistantDetail={
              !proxyProvider.isAvailable()
                ? t.aiAssistantUnset
                : app.aiAssistant
                  ? t.aiAssistantOn
                  : t.aiAssistantOff
            }
            contentVersion={CONTENT_VERSION}
            modelsLabel={`${readyCount} of ${statuses.length} installed`}
            historyLabel={`${allScans.length} scans stored on this device`}
            accountLabel={account.email ?? t.accountSignedOut}
            onChangeLanguage={lang =>
              dispatchApp({ type: 'setLanguage', language: lang === 'FIL' ? 'FIL' : 'EN' })
            }
            onToggleLocation={() => dispatchApp({ type: 'toggleLocation' })}
            onChangeLocation={() => push({ name: 'locationPicker' })}
            onForgetLocation={() => {
              dispatchApp({ type: 'forgetLocation' });
              notify('Saved location and cached climate rows cleared.');
            }}
            onRefreshNormals={() => {
              if (!app.savedLocation) {
                notify('Choose a location first — normals are fetched for a place.');
                return;
              }
              climate.refresh();
              notify('Refetching current conditions and 5-year normals…');
            }}
            onToggleAiAssistant={() => {
              dispatchApp({ type: 'toggleAiAssistant' });
              // Switching on something that cannot work is worth saying out
              // loud; the alternative is a toggle that silently does nothing.
              if (!app.aiAssistant && !proxyProvider.isAvailable()) {
                notify(t.aiAssistantUnset);
              }
            }}
            onOpenModels={() => push({ name: 'modelStatus' })}
            onOpenHistory={() => dispatch({ type: 'selectTab', tab: 'history' })}
            onOpenAccount={() => push({ name: 'account' })}
          />
        );
      case 'modelStatus':
        return (
          <ModelStatusScreen
            onImportModel={() =>
              notify('Put the .tflite in models/, then run npm run sync:models and restart.')
            }
          />
        );
      case 'locationPicker':
        return (
          <LocationPickerScreen
            current={app.savedLocation}
            onChoose={place => {
              dispatchApp({ type: 'setLocation', location: place });
              back();
            }}
          />
        );
      case 'account':
        return (
          <AccountScreen
            email={account.email}
            busy={account.busy}
            error={account.error}
            onSignIn={(email, password) => void handleSignIn(email, password)}
            onSignUp={(email, password) => void handleSignUp(email, password)}
            onSignOut={() => {
              void signOut().then(() => setAccount({ email: null, busy: false, error: null }));
            }}
          />
        );
      case 'capture':
        return null;
    }
  }
}
