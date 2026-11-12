import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText, Button, Card, Col, COLORS, Icon, RADIUS, Row, Section, SPACING, useT,
} from '../../ui';

export interface ConsentScreenProps {
  onAcknowledge: () => void | Promise<void>;
}

function Item({ icon, color, title, body }: { icon: 'send' | 'shield'; color: string; title: string; body: string }) {
  return (
    <Row gap={SPACING.md - 4} style={styles.item}>
      <Icon name={icon} size={22} color={color} />
      <Col gap={4} style={{ flex: 1 }}>
        <AppText variant="smSemi" color={color}>{title}</AppText>
        <AppText variant="xs" color={COLORS.textSecondary} style={{ lineHeight: 18 }}>{body}</AppText>
      </Col>
    </Row>
  );
}

/**
 * Shown on the account path only, immediately before sign-in.
 *
 * It is disclosure, not a choice: by this point the user has already chosen to
 * sync, and this says what syncing sends. An offline install never reaches it,
 * because an offline install sends nothing.
 */
export function ConsentScreen({ onAcknowledge }: ConsentScreenProps) {
  const t = useT();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const handleAcknowledge = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onAcknowledge();
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setBusy(false);
    }
  };

  return (
    <Section gap={SPACING.lg}>
      <AppText variant="smSemi" color={COLORS.textSecondary}>{t.onboardingStepConsent}</AppText>
      <AppText variant="xl" color={COLORS.primary} accessibilityRole="header">{t.consentTitle}</AppText>
      <View style={styles.card}>
        <Item icon="send" color={COLORS.text} title={t.consentSent} body={t.consentSentList} />
        <View style={styles.divider} />
        <Item icon="shield" color={COLORS.healthy} title={t.consentNeverSent} body={t.consentNeverSentList} />
      </View>

      {error && (
        <Col gap={SPACING.sm}>
          <AppText
            variant="smSemi"
            color={COLORS.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {t.onboardingSaveFailed}
          </AppText>
          <Button label={t.retry} onPress={handleAcknowledge} variant="secondary" />
        </Col>
      )}

      <Button 
        label={t.onboardingFinishSetup}
        onPress={handleAcknowledge} 
        disabled={busy}
      />
      {busy ? (
        <AppText variant="sm" color={COLORS.textSecondary} center accessibilityLiveRegion="polite">
          {t.onboardingSaving}
        </AppText>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
  },
  item: { padding: SPACING.md },
  divider: { height: 1, backgroundColor: COLORS.border },
});
