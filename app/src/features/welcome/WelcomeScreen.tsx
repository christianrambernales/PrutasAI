import React from 'react';
import { AppText, Button, Col, COLORS, Section, SPACING, useT } from '../../ui';

export interface WelcomeScreenProps {
  onChooseAccount: () => void;
  onChooseOffline: () => void;
}

/**
 * The first screen of a new install, and a real choice rather than a
 * disclosure: offline uploads nothing at all, so the consent screen — which
 * describes what is sent — is shown only on the account path, where it is true.
 */
export function WelcomeScreen({ onChooseAccount, onChooseOffline }: WelcomeScreenProps) {
  const t = useT();
  return (
    <Section gap={SPACING.lg}>
      <AppText variant="xl">{t.welcomeTitle}</AppText>

      <Col gap={SPACING.xs}>
        <AppText variant="mdSemi">{t.welcomeAccountTitle}</AppText>
        <AppText variant="sm" color={COLORS.textSecondary}>{t.welcomeAccountBody}</AppText>
      </Col>
      <Button label={t.welcomeAccountTitle} onPress={onChooseAccount} />

      <Col gap={SPACING.xs}>
        <AppText variant="mdSemi">{t.welcomeOfflineTitle}</AppText>
        <AppText variant="sm" color={COLORS.textSecondary}>{t.welcomeOfflineBody}</AppText>
      </Col>
      <Button label={t.welcomeChooseOffline} onPress={onChooseOffline} />
    </Section>
  );
}
