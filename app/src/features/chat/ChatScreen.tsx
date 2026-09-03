import React, { useCallback, useRef } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View,
  type GestureResponderHandlers,
} from 'react-native';
import { EDGE_WIDTH } from './ConversationSidebar';
import {
  AppText, Card, Chip, Col, COLORS, Divider, EmojiBadge, EvidencePill, Icon,
  PressableRow, RADIUS, Row, SPACING, Tile, useT,
} from '../../ui';
import type { ChatMessage, Suitability } from '../viewModels';
import { TypingIndicator } from './TypingIndicator';

export interface ChatScreenProps {
  messages: ChatMessage[];
  suggestions: string[];
  /**
   * True when answers are rendered from curated templates rather than reworded
   * online. This is NOT a connectivity claim — it used to be labelled "No
   * connection", which told every user with working internet that they were
   * offline, because the AI assistant is off by default.
   */
  curatedWording: boolean;
  /** Current input contents; owned by the caller so sending can clear it. */
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onSuggestion: (text: string) => void;
  /** True while an online provider is rewording the grounded answer. */
  pending?: boolean;
  /**
   * Pan handlers for the left-edge swipe that opens the conversation sidebar.
   *
   * They are applied to a narrow strip laid over the transcript rather than to
   * an ancestor, because on web the transcript is a natively scrolling element
   * and the responder negotiation never reaches a wrapper above it — in either
   * phase. Over the message list, which is nearly the whole screen, the gesture
   * never arrived at all. The strip stops short of the input bar, so nothing
   * there is covered.
   */
  edgeSwipeHandlers?: GestureResponderHandlers;
}

export function ChatScreen(props: ChatScreenProps) {
  const t = useT();
  const { messages, suggestions, curatedWording, draft, pending } = props;
  const scroller = useRef<ScrollView | null>(null);

  const toEnd = useCallback(() => {
    scroller.current?.scrollToEnd({ animated: true });
  }, []);

  const canSend = draft.trim() !== '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: SPACING.md }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={toEnd}
      >
        {curatedWording ? (
          <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
            <Tile style={{ backgroundColor: '#eef2f6' }}>
              <Row gap={SPACING.sm} align="flex-start">
                <Icon name="shield" size={16} color={COLORS.stable} />
                <AppText variant="xs" color="#2f5a76" style={{ flex: 1 }}>
                  {t.curatedBanner}
                </AppText>
              </Row>
            </Tile>
          </View>
        ) : null}

        <Col gap={SPACING.md - 4} style={{ paddingHorizontal: SPACING.md }}>
          {messages.map(msg => (
            <React.Fragment key={msg.id}>
              {msg.kind === 'general' ? (
                // A model wrote this, not the knowledge base. The caveat is part
                // of the bubble rather than a footnote precisely so it cannot be
                // mistaken for a grounded answer.
                <View style={[styles.bubble, styles.assistant, styles.general]}>
                  <Row gap={SPACING.xs + 2} style={{ paddingBottom: 6 }}>
                    <Icon name="sparkle" size={13} color={GENERAL_INK} />
                    <AppText variant="xsSemi" color={GENERAL_INK}>{t.generalGuidance}</AppText>
                  </Row>
                  <AppText variant="xs" color={GENERAL_INK} style={{ paddingBottom: 6 }}>
                    {t.notFromKnowledgeBase}
                  </AppText>
                  <AppText variant="sm">{msg.text}</AppText>
                </View>
              ) : (
                <View style={[styles.bubble, msg.role === 'user' ? styles.user : styles.assistant]}>
                  <AppText variant="sm" color={msg.role === 'user' ? COLORS.surface : COLORS.text}>
                    {msg.text}
                  </AppText>
                </View>
              )}
              {msg.verdict ? <VerdictCard verdict={msg.verdict} /> : null}
            </React.Fragment>
          ))}

          {pending ? (
            <View style={[styles.bubble, styles.assistant]}>
              <TypingIndicator />
            </View>
          ) : null}

          <Row gap={SPACING.xs + 2} wrap style={{ paddingTop: SPACING.xs }}>
            {suggestions.map(s => (
              <PressableRow key={s} accessibilityLabel={s} onPress={() => props.onSuggestion(s)}>
                <Chip label={s} tone="outline" />
              </PressableRow>
            ))}
          </Row>
        </Col>
      </ScrollView>

      {props.edgeSwipeHandlers ? (
        <View style={styles.edgeCatcher} {...props.edgeSwipeHandlers} />
      ) : null}
      </View>

      <Row gap={SPACING.sm + 2} style={styles.inputBar}>
        <TextInput
          style={styles.field}
          value={draft}
          onChangeText={props.onChangeDraft}
          placeholder={t.askPlaceholder}
          placeholderTextColor={COLORS.textLight}
          multiline
          accessibilityLabel={t.message}
          returnKeyType="send"
          onSubmitEditing={props.onSend}
          blurOnSubmit={false}
          onKeyPress={(e: any) => {
            const native = e.nativeEvent;
            if (native.key === 'Enter' && !native.shiftKey) {
              e.preventDefault?.();
              if (canSend) props.onSend();
            }
          }}
        />
        <PressableRow
          accessibilityLabel={t.send}
          onPress={props.onSend}
          disabled={!canSend}
        >
          <View style={[styles.send, !canSend && styles.sendOff]}>
            <Icon name="send" size={18} color={COLORS.surface} />
          </View>
        </PressableRow>
      </Row>
    </KeyboardAvoidingView>
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
            {verdict.fruitName}
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
        {verdict.sourceLabel}
      </AppText>
    </Card>
  );
}

/** The amber the app already uses for "computed, not curated" callouts. */
const GENERAL_INK = '#8a4b00';

const styles = StyleSheet.create({
  // Only as wide as the swipe's own start threshold, and only over the
  // transcript — the input bar below it stays fully tappable.
  //
  // `userSelect: 'none'` is what makes the gesture survive on web. Dragging
  // from a selectable surface starts a text selection, and react-native-web
  // treats the resulting `selectionchange` as grounds to terminate the
  // responder: the swipe was granted and then torn down mid-drag, every time,
  // so the release that opens the sidebar never ran.
  edgeCatcher: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE_WIDTH, userSelect: 'none',
  },
  bubble: { maxWidth: '86%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: RADIUS.lg },
  general: { borderColor: '#e8c99a', backgroundColor: '#fffaf2' },
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
    alignItems: 'flex-end',
  },
  field: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.4 },
});
