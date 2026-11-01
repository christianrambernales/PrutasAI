import React from 'react';
import { AppBar } from '../../ui';
import { CONTENT_VERSION } from '../../core/db/appDatabase';
import { findScan } from '../../core/db/repositories/scans';
import { restoreConversation } from '../../core/db/repositories/conversations';
import { deleteConversationEverywhere } from '../../core/sync/purgeTrash';
import { AccountScreen } from '../../features/account/AccountScreen';
import { EmailConfirmationScreen } from '../../features/account/EmailConfirmationScreen';
import { ForgotPasswordScreen } from '../../features/account/ForgotPasswordScreen';
import { LoginScreen } from '../../features/account/LoginScreen';
import { SignUpScreen } from '../../features/account/SignUpScreen';
import { ResetPasswordScreen } from '../../features/account/ResetPasswordScreen';
import { relativeTime } from '../../features/climate/useClimate';
import { LocationPickerScreen } from '../../features/location/LocationPickerScreen';
import { ModelStatusScreen } from '../../features/modelStatus/ModelStatusScreen';
import { MonitoringScreen } from '../../features/monitoring/MonitoringScreen';
import type { MonitoringController } from '../../features/monitoring/useMonitoring';
import { CaptureResultScreen } from '../../features/result/CaptureResultScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { TrashScreen } from '../../features/trash/TrashScreen';
import { VarietyInfoScreen } from '../../features/varietyInfo/VarietyInfoScreen';
import type { FruitSummary } from '../../features/viewModels';
import type { Language } from '../../ui/i18n/strings';
import type { Route } from '../navState';
import type { Shell } from '../shell';
import { ClimateBody, HistoryBody } from './localScreens';

type Strings = Shell['t'];

export function routeTitle(route: Route, t: Strings, fruits: FruitSummary[], language: Language = 'EN'): string {
  switch (route.name) {
    case 'history':
      return t.tabHistory;
    case 'climate':
      return t.tabClimate;
    case 'login':
      return t.signIn;
    case 'forgotPassword':
      return t.forgotPassword;
    case 'capture':
      return t.titleCapture;
    case 'captureResult':
      return t.titleScan;
    case 'result':
      return t.titleResult;
    // Titled from the route so opening Banana does not read "Mango".
    case 'varietyInfo': {
      const fruit = fruits.find(f => f.key === route.fruitKey);
      return fruit ? (language === 'FIL' ? fruit.nameFil : fruit.nameEn) : t.unknownFruit;
    }
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
    case 'resetPassword':
      return t.titleResetPassword;
    case 'trash':
      return t.titleTrash;
  }
}

export function RouteBar({ shell, route: r }: { shell: Shell; route: Route }) {
  const { t, app } = shell;
  const { back } = shell.nav;
  const { fruits } = shell.data;
  if (r.name === 'history') {
    return <AppBar title={t.tabHistory} onBack={back} action="search" actionLabel={t.searchScans}
      onAction={() => shell.dispatchApp({ type: app.historyQuery === null ? 'openSearch' : 'closeSearch' })} />;
  }
  if (r.name === 'climate') {
    return <AppBar title={t.tabClimate} onBack={back} action="refresh" actionLabel={t.refreshClimate}
      onAction={() => {
        if (!app.savedLocation) { shell.nav.push({ name: 'locationPicker' }); return; }
        shell.climate.climate.refresh();
      }} />;
  }
  return <AppBar title={routeTitle(r, t, fruits, app.language)} onBack={back} />;
}

export function RouteBody({ shell, route: r, monitoring }: { shell: Shell; route: Route; monitoring?: MonitoringController }) {
  const { t, app, dispatchApp, climate, account } = shell;
  const {
    push, replace, back, notify, selectTab,
    openVariety, setOpenVariety, openCheckpoint, setOpenCheckpoint,
  } = shell.nav;
  const {
    db, fruits, varietiesByFruit, strainsByFruit, sourcesByFruit, diseasesByFruit, allScans,
    trashedConversations, statuses, capability, depth, readyCount, aiAvailable, bumpData, accountScope,
  } = shell.data;

  switch (r.name) {
    case 'history':
      return <HistoryBody shell={shell} />;
    case 'climate':
      return <ClimateBody shell={shell} />;
    case 'captureResult':
      return (
        <CaptureResultScreen
          photoUri={r.photoUri}
          view={r.view}
          onReviewPhoto={() => replace({ name: 'captureResult', scanId: r.scanId, photoUri: r.photoUri, view: 'photo' })}
          onBrowseGuidance={() => selectTab('home')}
          onStartMonitoring={() => push({ name: 'monitoring', sessionId: r.scanId })}
          onBackToSummary={() => replace({ name: 'captureResult', scanId: r.scanId, photoUri: r.photoUri, view: 'summary' })}
        />
      );
    case 'result': {
      // A stored scan holds a photo, a time and whatever the pipeline
      // recorded — which today is nothing, because no weights are installed.
      // So reopening one shows the same honest state a fresh capture shows.
      // It must never fall back to the design preview: that is how a
      // fabricated diagnosis reached a screen once already.
      const stored = findScan(db, r.scanId, accountScope);
      return (
        <CaptureResultScreen
          photoUri={stored?.imageUri ?? ''}
          record={
            stored
              ? { title: stored.title, detail: stored.detail, timeLabel: stored.timeLabel }
              : {
                  title: 'Scan not found',
                  detail: 'This scan is no longer stored on this device.',
                  timeLabel: '',
                }
          }
          onReviewPhoto={() => replace({ name: 'captureResult', scanId: r.scanId, photoUri: stored?.imageUri ?? '', view: 'photo' })}
          onBrowseGuidance={() => {
            if (stored?.fruitKey) {
              push({ name: 'varietyInfo', fruitKey: stored.fruitKey });
            } else {
              selectTab('home');
            }
          }}
          onStartMonitoring={() => push({ name: 'monitoring', sessionId: r.scanId })}
          onBackToSummary={() => back()}
        />
      );
    }
    case 'varietyInfo': {
      const fruit = fruits.find(f => f.key === r.fruitKey) ?? null;
      return (
        <VarietyInfoScreen
          fruit={fruit}
          modelVarieties={r.fruitKey ? varietiesByFruit[r.fruitKey] ?? [] : []}
          informationOnly={r.fruitKey ? strainsByFruit[r.fruitKey] ?? [] : []}
          diseases={r.fruitKey ? diseasesByFruit[r.fruitKey] ?? [] : []}
          requirementsVerified={false}
          requirements={[
            { label: 'Temperature', value: '24\u201330 \u00B0C', icon: 'thermometer' },
            { label: 'Annual rainfall', value: '1,000\u20132,000 mm', icon: 'cloudRain' },
            { label: 'Elevation', value: 'below 600 m', icon: 'mountain' },
          ]}
          sources={r.fruitKey ? sourcesByFruit[r.fruitKey] ?? [] : []}
          expandedVarietyKey={openVariety}
          onOpenVariety={key => setOpenVariety(current => (current === key ? null : key))}
          onBack={back}
        />
      );
    }
    case 'monitoring': {
      return (
        <MonitoringScreen
          controller={monitoring}
          expandedCheckpointDay={openCheckpoint}
          onCapturePhoto={day => push({ name: 'capture', target: { type: 'checkpoint', sessionId: r.sessionId, dayNumber: day } })}
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
              ? `${climate.climate.normals.fromYear}–${climate.climate.normals.toYear} historical mean · fetched ${relativeTime(climate.climate.historicalFetchedAt)}`
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
          modelsLabel={`${t.modelsInstalled(readyCount, statuses.length)} · ${t.modelInferenceUnverified}`}
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
            notify('Refetching current conditions and the five-year historical mean…');
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
          onOpenHistory={() => push({ name: 'history' })}
          onOpenAccount={account.openAccount}
          onOpenTrash={() => push({ name: 'trash' })}
          syncMode={account.account.syncMode}
          onSetSyncMode={account.handleChooseMode}
        />
      );
    case 'modelStatus':
      return <ModelStatusScreen language={app.language} />;
    case 'locationPicker':
      return (
        <LocationPickerScreen
          current={app.savedLocation}
          onChoose={place => {
            dispatchApp({ type: 'setLocation', location: place });
            back();
          }}
          onCancel={back}
        />
      );
    case 'login':
      return (
        <LoginScreen
          busy={account.account.busy}
          error={account.account.error}
          onSignIn={(email, password) => void account.signIn(email, password)}
          onForgotPassword={() => push({ name: 'forgotPassword' })}
          onCreateAccount={() => push({ name: 'signup' })}
          onContinueOffline={account.continueOffline}
          onCancel={back}
        />
      );
    case 'forgotPassword':
      return (
        <ForgotPasswordScreen
          busy={account.account.busy}
          error={account.account.error}
          message={account.account.resetMessage}
          onSubmit={email => void account.forgotPassword(email)}
          onBack={back}
        />
      );
    case 'account':
      if (account.account.confirmationPendingEmail) {
        return (
          <EmailConfirmationScreen
            email={account.account.confirmationPendingEmail}
            busy={account.account.busy}
            error={account.account.error}
            message={account.account.resetMessage}
            onResend={() => void account.resendConfirmation(account.account.confirmationPendingEmail!)}
            onContinueOffline={account.continueOffline}
            onBackToSignIn={() => replace({ name: 'login' })}
          />
        );
      }
      return (
        <AccountScreen
          email={account.account.email}
          userId={account.account.userId}
          busy={account.account.busy}
          error={account.account.error}
          resetMessage={account.account.resetMessage}
          confirmationPendingEmail={account.account.confirmationPendingEmail}
          onSignIn={(email, password) => void account.signIn(email, password)}
          onForgotPassword={email => void account.forgotPassword(email)}
          onCreateAccount={() => push({ name: 'signup' })}
          onOpenLogin={() => push({ name: 'login' })}
          onSignOut={() => { void account.signOut(); }}
          onResendConfirmation={email => void account.resendConfirmation(email)}
          onContinueOffline={account.continueOffline}
          syncMode={account.account.syncMode}
          unownedClaimPending={account.account.unownedClaimPending}
          onClaimUnowned={() => void account.claimUnowned()}
          onDeclineUnowned={() => void account.declineUnowned()}
          onSetSyncMode={account.handleChooseMode}
          syncCounts={account.account.syncCounts}
          lastSuccessfulSyncAt={account.account.lastSuccessfulSyncAt}
          onSyncNow={() => void account.syncNow()}
          onRemoveLocalDeviceCopy={() => void account.removeLocalDeviceCopy()}
          language={app.language}
          savedLocationLabel={climate.savedLocationLabel}
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
            notify('Refetching current conditions and the five-year historical mean…');
          }}
          onToggleAiAssistant={() => {
            dispatchApp({ type: 'toggleAiAssistant' });
            if (!app.aiAssistant && !aiAvailable) {
              notify(t.aiAssistantUnset);
            }
          }}
          onOpenModels={() => push({ name: 'modelStatus' })}
          onOpenHistory={() => push({ name: 'history' })}
          onOpenAccount={account.openAccount}
          onOpenTrash={() => push({ name: 'trash' })}
          modelsLabel={`${t.modelsInstalled(readyCount, statuses.length)} · ${t.modelInferenceUnverified}`}
          historyLabel={`${allScans.length} scans stored on this device`}
          accountLabel={account.account.email ?? t.accountSignedOut}
          trashedCount={trashedConversations.length}
          contentVersion={CONTENT_VERSION}
        />
      );
    case 'signup':
      return (
        <SignUpScreen
          busy={account.account.busy}
          error={account.account.error}
          confirmationPendingEmail={account.account.confirmationPendingEmail}
          noticeMessage={account.account.resetMessage}
          onSignUp={(email, password) => void account.signUp(email, password)}
          onGoToSignIn={back}
          onResendConfirmation={email => void account.resendConfirmation(email)}
          onContinueOffline={account.continueOffline}
        />
      );
    case 'capture':
      return null;
    case 'resetPassword':
      return (
        <ResetPasswordScreen
          busy={account.account.busy}
          error={account.account.error}
          onSubmitNewPassword={account.setNewPassword}
          onCancel={() => {
            account.clearRecovery();
            back();
          }}
          onDone={back}
        />
      );
    case 'trash':
      return (
        <TrashScreen
          conversations={trashedConversations}
          onRestore={uuids => {
            const restoredAt = new Date().toISOString();
            db.transaction(() => {
              uuids.forEach(uuid => {
                if (!restoreConversation(db, uuid, restoredAt, accountScope)) {
                  throw new Error('Restore unavailable');
                }
              });
            });
            bumpData();
          }}
          onDeleteForever={async uuids => {
            // The same permanent deletion the retention sweep performs, so
            // the remote row goes too: deleting only locally means the
            // conversation returns on the next sign-in restore.
            //
            // Awaited before the bump because the local rows now go after the
            // remote one: refreshing first would re-read a Trash that has not
            // been emptied yet. A conversation whose remote delete failed
            // stays in the list, which is what actually happened to it.
            for (const uuid of uuids) {
              const deleted = await deleteConversationEverywhere(db, uuid, undefined, accountScope);
              if (!deleted) throw new Error('Permanent deletion unavailable');
              bumpData();
            }
          }}
        />
      );
  }
}
