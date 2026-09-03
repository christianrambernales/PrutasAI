import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText, Button, Col, COLORS, Icon, RADIUS, Row, Section, SPACING, useT,
} from '../../ui';

export interface ConsentScreenProps {
  onAcknowledge: () => void;
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
  return (
    <Section gap={SPACING.md}>
      <AppText variant="xl">{t.consentTitle}</AppText>
      <View style={styles.card}>
        <Item icon="send" color={COLORS.text} title={t.consentSent} body={t.consentSentList} />
        <View style={styles.divider} />
        <Item icon="shield" color={COLORS.success} title={t.consentNeverSent} body={t.consentNeverSentList} />
      </View>
      <Button label={t.consentAcknowledge} onPress={onAcknowledge} />
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
