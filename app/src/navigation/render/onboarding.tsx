import React from 'react';
import { LanguageProvider, Screen, ScreenBody } from '../../ui';
import { ConsentScreen } from '../../features/consent/ConsentScreen';
import { LanguagePickScreen } from '../../features/language/LanguagePickScreen';
import { WelcomeScreen } from '../../features/welcome/WelcomeScreen';
import type { Language } from '../../state/appState';

type SyncMode = 'offline' | 'account';

export interface OnboardingGateProps {
  language: Language;
  languagePicked: boolean;
  syncMode: SyncMode | null;
  consented: boolean;
  accountRequested: boolean;
  onPickLanguage: (language: Language) => void;
  onChooseOffline: () => void;
  onChooseAccount: () => void;
  onAcknowledgeConsent: () => void;
}

/**
 * Whether any onboarding screen is owed, independent of which one. Exported
 * so `AppNavigator` can gate rendering on the same rule `OnboardingGate` uses
 * to pick a screen below — the two must agree on *whether*, this component
 * decides *which*.
 */
export function needsOnboarding(p: Pick<OnboardingGateProps,
  'languagePicked' | 'syncMode' | 'consented' | 'accountRequested'>): boolean {
  return !p.languagePicked || p.syncMode === null
    || ((p.syncMode === 'account' || p.accountRequested) && !p.consented);
}

/**
 * The screens that must be answered before the app proper, in the one order
 * that works. Returns null once all three are satisfied.
 */
export function OnboardingGate(props: OnboardingGateProps): React.ReactElement | null {
  const { language, languagePicked, syncMode, consented, accountRequested } = props;

  // Before anything else, including Welcome: neither Welcome nor the choice
  // it presents can be read without a language. Ungated for both a fresh
  // install and any existing install that predates this screen.
  if (!languagePicked) {
    return (
      <LanguageProvider language={language}>
        <Screen>
          <ScreenBody>
            <LanguagePickScreen onPick={props.onPickLanguage} />
          </ScreenBody>
        </Screen>
      </LanguageProvider>
    );
  }

  // Before anything else, including consent: an offline install must never see
  // a screen describing what gets sent.
  if (syncMode === null) {
    return (
      <LanguageProvider language={language}>
        <Screen>
          <ScreenBody>
            <WelcomeScreen
              onChooseOffline={props.onChooseOffline}
              onChooseAccount={props.onChooseAccount}
            />
          </ScreenBody>
        </Screen>
      </LanguageProvider>
    );
  }

  // Shown once, before anything else — including the camera route, which a
  // fresh install cannot have navigated to yet. An offline install skips it
  // while it stays offline: it sends nothing, so there is nothing to disclose.
  // `accountRequested` is the other half: the offline user who later asks for
  // an account from Settings, for whom it has just become true.
  if ((syncMode === 'account' || accountRequested) && !consented) {
    return (
      <LanguageProvider language={language}>
        <Screen>
          <ScreenBody>
            <ConsentScreen onAcknowledge={props.onAcknowledgeConsent} />
          </ScreenBody>
        </Screen>
      </LanguageProvider>
    );
  }

  return null;
}
