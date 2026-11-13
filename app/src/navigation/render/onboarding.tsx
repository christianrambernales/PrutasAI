import React from 'react';
import { LanguageProvider } from '../../ui';
import { WelcomeScreen } from '../../features/welcome/WelcomeScreen';
import type { Language } from '../../state/appState';

type SyncMode = 'offline' | 'account';

export interface OnboardingFlags {
  languagePicked: boolean;
  syncMode: SyncMode | null;
  consented: boolean;
  accountRequested: boolean;
}

export interface OnboardingGateProps extends OnboardingFlags {
  language: Language;
  onPickLanguage: (language: Language) => void | Promise<void>;
  onChooseOffline: () => void | Promise<void>;
  onChooseAccount: () => void | Promise<void>;
  onAcknowledgeConsent: () => void | Promise<void>;
  onSignIn?: () => void | Promise<void>;
}

/**
 * Whether any onboarding screen is owed, independent of which one. Exported
 * so `AppNavigator` can gate rendering on the same rule `OnboardingGate` uses.
 */
export function needsOnboarding(p: OnboardingFlags): boolean {
  return !p.languagePicked || p.syncMode === null
    || ((p.syncMode === 'account' || p.accountRequested) && !p.consented);
}

/**
 * Single-screen prototype v2 onboarding gate. Returns null once onboarding
 * requirements are satisfied.
 */
export function OnboardingGate(props: OnboardingGateProps): React.ReactElement | null {
  if (!needsOnboarding(props)) return null;

  return (
    <LanguageProvider language={props.language}>
      <WelcomeScreen
        currentLanguage={props.language}
        onSelectLanguage={props.onPickLanguage}
        onChooseLocal={async () => {
          if (!props.languagePicked) await props.onPickLanguage(props.language);
          await props.onChooseOffline();
          if (!props.consented) await props.onAcknowledgeConsent();
        }}
        onChooseAccount={async () => {
          if (!props.languagePicked) await props.onPickLanguage(props.language);
          await props.onChooseAccount();
          if (!props.consented) await props.onAcknowledgeConsent();
        }}
        onSignIn={async () => {
          if (!props.languagePicked) await props.onPickLanguage(props.language);
          await props.onChooseAccount();
          if (!props.consented) await props.onAcknowledgeConsent();
          await props.onSignIn?.();
        }}
      />
    </LanguageProvider>
  );
}
