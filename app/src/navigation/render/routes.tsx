import React from 'react';
import { AppBar } from '../../ui';
import { CONTENT_VERSION } from '../../core/db/appDatabase';
import { findScan } from '../../core/db/repositories/scans';
import { restoreConversation } from '../../core/db/repositories/conversations';
import { deleteConversationEverywhere } from '../../core/sync/purgeTrash';
import { AccountScreen } from '../../features/account/AccountScreen';
import { SignUpScreen } from '../../features/account/SignUpScreen';
import { relativeTime } from '../../features/climate/useClimate';
import { LocationPickerScreen } from '../../features/location/LocationPickerScreen';
import { ModelStatusScreen } from '../../features/modelStatus/ModelStatusScreen';
import { MonitoringScreen } from '../../features/monitoring/MonitoringScreen';
import { CaptureResultScreen } from '../../features/result/CaptureResultScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { TrashScreen } from '../../features/trash/TrashScreen';
import { VarietyInfoScreen } from '../../features/varietyInfo/VarietyInfoScreen';
import type { FruitSummary } from '../../features/viewModels';
import * as preview from '../../preview/previewContent';
import type { Route } from '../navState';
import type { Shell } from '../shell';

type Strings = Shell['t'];

export function routeTitle(route: Route, t: Strings, fruits: FruitSummary[]): string {
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
    case 'signup':
      return t.titleSignUp;
    case 'trash':
      return t.titleTrash;
  }
}

export function RouteBar({ shell, route: r }: { shell: Shell; route: Route }) {
  const { t } = shell;
  const { back, notify } = shell.nav;
  const { fruits, statuses, readyCount } = shell.data;

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

export function RouteBody({ shell, route: r }: { shell: Shell; route: Route }) {
  const { t, app, dispatchApp, climate, account } = shell;
  const {
    push, replace, back, notify, selectTab,
    openVariety, setOpenVariety, openCheckpoint, setOpenCheckpoint,
  } = shell.nav;
  const {
    db, fruits, varietiesByFruit, strainsByFruit, sourcesByFruit, allScans,
    trashedConversations, statuses, capability, depth, readyCount, aiAvailable, bumpData,
  } = shell.data;

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
          savedLocationLabel={climate.savedLocationLabel}
          climateProvider="Open-Meteo · no API key needed"
          normalsFetchedLabel={
            climate.climate.normals
              ? `${climate.climate.normals.fromYear}–${climate.climate.normals.toYear} normals · fetched ${relativeTime(climate.climate.fetchedAt)}`
              : 'Not fetched yet'
          }
          aiAssistant={app.aiAssistant}
          aiAssistantDetail={
            !aiAvailable
              ? t.aiAssistantUnset
              : app.aiAssistant
                ? t.aiAssistantOn
                : t.aiAssistantOff
          }
          contentVersion={CONTENT_VERSION}
          modelsLabel={`${readyCount} of ${statuses.length} installed`}
          historyLabel={`${allScans.length} scans stored on this device`}
          accountLabel={account.account.email ?? t.accountSignedOut}
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
            climate.climate.refresh();
            notify('Refetching current conditions and 5-year normals…');
          }}
          onToggleAiAssistant={() => {
            dispatchApp({ type: 'toggleAiAssistant' });
            // Switching on something that cannot work is worth saying out
            // loud; the alternative is a toggle that silently does nothing.
            if (!app.aiAssistant && !aiAvailable) {
              notify(t.aiAssistantUnset);
            }
          }}
          onOpenModels={() => push({ name: 'modelStatus' })}
          onOpenHistory={() => selectTab('history')}
          onOpenAccount={account.openAccount}
          onOpenTrash={() => push({ name: 'trash' })}
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
          email={account.account.email}
          busy={account.account.busy}
          error={account.account.error}
          resetMessage={account.account.resetMessage}
          onSignIn={(email, password) => void account.signIn(email, password)}
          onForgotPassword={email => void account.forgotPassword(email)}
          onCreateAccount={() => push({ name: 'signup' })}
          onSignOut={() => { void account.signOut(); }}
        />
      );
    case 'signup':
      return (
        <SignUpScreen
          busy={account.account.busy}
          error={account.account.error}
          onSignUp={(email, password) => void account.signUp(email, password)}
          onGoToSignIn={back}
        />
      );
    case 'capture':
      return null;
    case 'trash':
      return (
        <TrashScreen
          conversations={trashedConversations}
          onRestore={uuids => {
            const restoredAt = new Date().toISOString();
            uuids.forEach(uuid => restoreConversation(db, uuid, restoredAt));
            bumpData();
          }}
          onDeleteForever={uuids => {
            // The same permanent deletion the retention sweep performs, so
            // the remote row goes too: deleting only locally means the
            // conversation returns on the next sign-in restore.
            //
            // Awaited before the bump because the local rows now go after the
            // remote one: refreshing first would re-read a Trash that has not
            // been emptied yet. A conversation whose remote delete failed
            // stays in the list, which is what actually happened to it.
            void (async () => {
              for (const uuid of uuids) await deleteConversationEverywhere(db, uuid);
              bumpData();
            })();
          }}
        />
      );
  }
}
