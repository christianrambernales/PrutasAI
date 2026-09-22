import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText, Button, Col, COLORS, Icon, RADIUS, Row, Section, SPACING, useT,
} from '../../ui';

export interface ConsentScreenProps {
  onAcknowledge: () => void | Promise<void>;
}

function Item({ icon, color, title, body }: { icon: 'send' | 'shield'; color: string; title: string; body: string }) {
  return (
    <Row gap={SPACING.md - 4} style={styles.item}>
      <Icon name={icon} size={20} color={color} />
      <Col gap={2} style={{ flex: 1 }}>
        <AppText variant="smSemi" color={color}>{title}</AppText>
        <AppText variant="sm" color={COLORS.textSecondary}>{body}</AppText>
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
    <Section gap={SPACING.md}>
      <AppText variant="smSemi" color={COLORS.textSecondary}>Step 3 of 3: Consent</AppText>
      <AppText variant="xl">{t.consentTitle}</AppText>
      <View style={styles.card}>
        <Item icon="send" color={COLORS.text} title={t.consentSent} body={t.consentSentList} />
        <View style={styles.divider} />
        <Item icon="shield" color={COLORS.success} title={t.consentNeverSent} body={t.consentNeverSentList} />
      </View>

      {error && (
        <Col gap={SPACING.sm}>
          <AppText variant="smSemi" color={COLORS.error}>Failed to save</AppText>
          <AppText variant="sm">{error.message}</AppText>
          <Button label="Retry" onPress={handleAcknowledge} variant="secondary" />
        </Col>
      )}

      <Button 
        label={busy ? 'Saving...' : t.onboardingFinishSetup} 
        onPress={handleAcknowledge} 
        disabled={busy}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  item: { padding: SPACING.md - 4 },
  divider: { height: 1, backgroundColor: COLORS.border },
});
