import React, { useState } from 'react';
import { AppText, Button, Col, COLORS, Section, SPACING, useT } from '../../ui';

export interface WelcomeScreenProps {
  onChooseAccount: () => void | Promise<void>;
  onChooseOffline: () => void | Promise<void>;
}

export function WelcomeScreen({ onChooseAccount, onChooseOffline }: WelcomeScreenProps) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [choice, setChoice] = useState<'account' | 'offline' | null>(null);

  const handleSubmit = async () => {
    if (!choice || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (choice === 'account') {
        await onChooseAccount();
      } else {
        await onChooseOffline();
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setBusy(false);
    }
  };

  return (
    <Section gap={SPACING.lg}>
      <AppText variant="smSemi" color={COLORS.textSecondary}>Step 2 of 3: Mode</AppText>
      <AppText variant="xl">{t.welcomeTitle}</AppText>

      <Col gap={SPACING.xs}>
        <AppText variant="mdSemi">{t.welcomeAccountTitle}</AppText>
        <AppText variant="sm" color={COLORS.textSecondary}>{t.welcomeAccountBody}</AppText>
      </Col>
      <Button 
        label={t.welcomeAccountTitle} 
        onPress={() => { if (!busy) setChoice('account'); }} 
        variant={choice === 'account' ? 'primary' : 'secondary'}
        disabled={busy}
      />

      <Col gap={SPACING.xs}>
        <AppText variant="mdSemi">{t.welcomeOfflineTitle}</AppText>
        <AppText variant="sm" color={COLORS.textSecondary}>{t.welcomeOfflineBody}</AppText>
      </Col>
      <Button 
        label={t.welcomeChooseOffline} 
        onPress={() => { if (!busy) setChoice('offline'); }} 
        variant={choice === 'offline' ? 'primary' : 'secondary'}
        disabled={busy}
      />

      {error && (
        <Col gap={SPACING.sm}>
          <AppText variant="smSemi" color={COLORS.error}>Failed to save</AppText>
          <AppText variant="sm">{error.message}</AppText>
          <Button label="Retry" onPress={handleSubmit} variant="secondary" />
        </Col>
      )}

      {choice && (
        <Button
          label={busy ? 'Saving...' : (choice === 'offline' ? t.onboardingFinishSetup : t.onboardingReviewConsent)}
          onPress={handleSubmit}
          disabled={busy}
        />
      )}
    </Section>
  );
}
