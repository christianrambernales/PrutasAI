import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AppText, Card, Chip, Col, COLORS, Divider, EmojiBadge, EvidencePill, Icon,
  PressableRow, RADIUS, Row, SPACING, Tile,
} from '../../ui';
import type { ChatMessage, Suitability } from '../viewModels';

export interface ChatScreenProps {
  messages: ChatMessage[];
  /** Rendered inline after the first assistant reply; the deterministic answer. */
  verdict: Suitability | null;
  suggestions: string[];
  offline: boolean;
  onSend: () => void;
  onSuggestion: (text: string) => void;
}

export function ChatScreen(props: ChatScreenProps) {
  const { messages, verdict, suggestions, offline } = props;

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: SPACING.md }}
        showsVerticalScrollIndicator={false}
      >
        {offline ? (
          <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
            <Tile style={{ backgroundColor: '#eef2f6' }}>
              <Row gap={SPACING.sm} align="flex-start">
                <Icon name="wifiOff" size={16} color={COLORS.stable} />
                <AppText variant="xs" color="#2f5a76" style={{ flex: 1 }}>
                  No connection. Answers come from the bundled knowledge base and cached climate —
                  the wording is curated, not generated.
                </AppText>
              </Row>
            </Tile>
          </View>
        ) : null}

        <Col gap={SPACING.md - 4} style={{ paddingHorizontal: SPACING.md }}>
          {messages.map((msg, i) => (
            <React.Fragment key={msg.id}>
              <View style={[styles.bubble, msg.role === 'user' ? styles.user : styles.assistant]}>
                <AppText variant="sm" color={msg.role === 'user' ? COLORS.surface : COLORS.text}>
                  {msg.text}
                </AppText>
              </View>
              {verdict && i === 1 ? <VerdictCard verdict={verdict} /> : null}
            </React.Fragment>
          ))}

          <Row gap={SPACING.xs + 2} wrap style={{ paddingTop: SPACING.xs }}>
            {suggestions.map(s => (
              <PressableRow key={s} onPress={() => props.onSuggestion(s)}>
                <Chip label={s} tone="outline" />
              </PressableRow>
            ))}
          </Row>
        </Col>
      </ScrollView>

      <Row gap={SPACING.sm + 2} style={styles.inputBar}>
        <View style={styles.field}>
          <AppText variant="sm" color={COLORS.textLight}>
            Ask about a fruit, a disease or your location…
          </AppText>
        </View>
        <PressableRow onPress={props.onSend}>
          <View style={styles.send}>
            <Icon name="send" size={18} color={COLORS.surface} />
          </View>
        </PressableRow>
      </Row>
    </>
  );
}

function VerdictCard({ verdict }: { verdict: Suitability }) {
  return (
    <Card style={{ gap: SPACING.sm + 2 }}>
      <Row gap={SPACING.sm}>
        <EmojiBadge emoji={verdict.fruitEmoji} size={34} />
        <Col gap={2} style={{ flex: 1 }}>
          <AppText variant="smSemi" color="#8a4b00">{verdict.headline}</AppText>
          <AppText variant="xs" color={COLORS.textSecondary}>
            {verdict.fruitName} · Los Baños, Laguna
          </AppText>
        </Col>
      </Row>
      <Divider />
      <Col>
        {verdict.evidence.map((ev, i) => (
          <Col key={ev.label}>
            {i > 0 ? <Divider /> : null}
            <Row gap={SPACING.sm} style={{ paddingVertical: 7 }}>
              <AppText variant="xs" color={COLORS.textSecondary} style={{ flex: 1 }}>{ev.label}</AppText>
              <AppText variant="xsSemi">{ev.value}</AppText>
              <EvidencePill status={ev.status} />
            </Row>
          </Col>
        ))}
      </Col>
      <Divider />
      <AppText variant="xs" color={COLORS.textLight}>
        Climate normals cached 12 Jun 2026 · PCAARRD-DOST, Open-Meteo
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '86%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: RADIUS.lg },
  user: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  assistant: {
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 5,
  },
  inputBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md - 4,
    paddingVertical: SPACING.sm + 2,
  },
  field: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
