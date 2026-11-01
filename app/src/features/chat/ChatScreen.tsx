import React, { useCallback, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderHandlers,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EDGE_WIDTH } from './ConversationSidebar';
import {
  AppText,
  Card,
  Chip,
  Col,
  COLORS,
  Divider,
  EmojiBadge,
  EvidencePill,
  FrostedCard,
  GreenTopCell,
  Icon,
  RADIUS,
  Row,
  SPACING,
  useLanguage,
  useT,
} from '../../ui';
import type { ChatMessage, Suitability } from '../viewModels';
import { TypingIndicator } from './TypingIndicator';

export type ChatScreenMessage = ChatMessage | {
  id: string;
  sender?: 'bot' | 'user' | 'assistant';
  role?: 'user' | 'assistant';
  text: string;
  kind?: 'grounded' | 'general' | 'restricted' | 'refusal' | 'notice';
  verdict?: Suitability | null;
};

export interface ChatScreenProps {
  messages: ChatScreenMessage[];
  suggestions?: string[];
  /**
   * True when answers are rendered from curated templates rather than reworded
   * online. This is NOT a connectivity claim — it used to be labelled "No
   * connection", which told every user with working internet that they were
   * offline, because the AI assistant is off by default.
   */
  curatedWording?: boolean;
  /** Current input contents; owned by the caller so sending can clear it. */
  draft?: string;
  draftText?: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onSuggestion?: (text: string) => void;
  /** True while an online provider is rewording the grounded answer. */
  pending?: boolean;
  /** Present only after a retryable provider failure. */
  onRetry?: () => void;
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
  /** Handler to open the conversation drawer. */
  onOpenConversations?: () => void;
  onOpenDrawer?: () => void;
  /** Handler to start a new conversation. */
  onNewConversation?: () => void;
  onNewChat?: () => void;
  /** Conversation title. */
  conversationTitle?: string;
  activeTitle?: string;
  placeholder?: string;
}

const DEFAULT_STARTERS = [
  'How do I monitor my crop recovery?',
  'What are the symptoms of anthracnose?',
  'Is my area suitable for mango?',
];

export function ChatScreen(props: ChatScreenProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';
  const {
    messages,
    suggestions = DEFAULT_STARTERS,
    curatedWording = true,
    pending,
  } = props;
  const draft = props.draft ?? props.draftText ?? '';
  const onOpenDrawer = props.onOpenDrawer ?? props.onOpenConversations;
  const onNewChat = props.onNewChat ?? props.onNewConversation;
  const activeTitle = props.activeTitle ?? props.conversationTitle ?? (isFil ? 'Katuwang sa Pananim' : 'Agro-Assistant');
  const subtitle = isFil ? 'Naka-save na Kaalaman' : 'Curated Offline Knowledge';
  const scroller = useRef<ScrollView | null>(null);

  const toEnd = useCallback(() => {
    scroller.current?.scrollToEnd({ animated: true });
  }, []);

  const canSend = draft.trim().length > 0 && !pending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f1f5f2' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        {/* 1. GreenTopCell Header */}
        <GreenTopCell
          title={activeTitle}
          subtitle={subtitle}
          leftAction={
            onOpenDrawer ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.chatConversations}
                onPress={onOpenDrawer}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.drawerButton}
              >
                <Text style={styles.drawerButtonIcon}>☰</Text>
              </Pressable>
            ) : null
          }
          rightAction={
            onNewChat ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.newConversation}
                onPress={onNewChat}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.headerNewPill}
              >
                <Text style={styles.headerNewPillText}>+ {isFil ? 'Bago' : 'New'}</Text>
              </Pressable>
            ) : null
          }
          style={styles.topCell}
        />

        {/* 2. Safety Disclaimer Banner */}
        <View style={styles.safetyBannerWrapper}>
          <View style={styles.safetyBanner}>
            <Text style={styles.safetyIcon}>🛡️</Text>
            <AppText variant="xs" color="#0369a1" style={{ flex: 1, lineHeight: 17 }}>
              {t.chatDecisionSupportBanner}
            </AppText>
          </View>
        </View>

        {/* 3. Transcript Messages List or Blank-first Welcome View */}
        <ScrollView
          ref={scroller}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, paddingTop: 4, gap: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={toEnd}
        >
          {messages.length === 0 ? (
            <Col gap={SPACING.md} style={{ paddingTop: SPACING.xs }}>
              <Card style={styles.welcomeCard}>
                <Row gap={SPACING.md} align="center">
                  <View style={styles.welcomeAvatar}>
                    <AppText variant="xl">🌾</AppText>
                  </View>
                  <Col gap={2} style={{ flex: 1 }}>
                    <AppText variant="mdSemi" color={COLORS.primary}>
                      {t.welcomeAssistantTitle}
                    </AppText>
                    <AppText variant="xs" color={COLORS.textSecondary}>
                      {t.welcomeAssistantDetail}
                    </AppText>
                  </Col>
                </Row>
              </Card>

              <Col gap={SPACING.xs + 2} style={{ paddingTop: SPACING.xs }}>
                <AppText variant="xsSemi" color={COLORS.primary}>
                  {t.starterQuestionsTitle}
                </AppText>
                {(suggestions.length > 0 ? suggestions : DEFAULT_STARTERS).map(s => (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    accessibilityLabel={s}
                    onPress={() => props.onSuggestion?.(s)}
                    style={styles.starterButton}
                  >
                    <Row gap={SPACING.sm} align="center">
                      <Icon name="sparkle" size={14} color={COLORS.primary} />
                      <AppText variant="sm" color={COLORS.text} style={{ flex: 1 }}>
                        {s}
                      </AppText>
                    </Row>
                  </Pressable>
                ))}
              </Col>
            </Col>
          ) : null}

          {messages.map((msg, index) => {
            if (msg.kind === 'notice' && messages[index - 1]?.kind === 'grounded') return null;
            const rephraseNotice = msg.kind === 'grounded' && messages[index + 1]?.kind === 'notice'
              ? messages[index + 1]
              : null;
            const isUser = msg.role === 'user' || (msg as any).sender === 'user';

            if (isUser) {
              return (
                <View key={msg.id} style={styles.userBubble}>
                  <Text style={styles.userBubbleText}>{msg.text}</Text>
                </View>
              );
            }

            return (
              <React.Fragment key={msg.id}>
                <FrostedCard
                  surfaceColor="#ffffff"
                  style={styles.botCard}
                >
                  <View style={styles.botCardHeader}>
                    <Text style={styles.botCardTitle}>🌾 {t.assistantBotName}</Text>
                  </View>
                  {msg.kind === 'restricted' ? (
                    <View style={styles.restrictedNotice}>
                      <Row gap={SPACING.xs + 2} style={{ paddingBottom: 4 }}>
                        <Icon name="shield" size={13} color={GENERAL_INK} />
                        <AppText variant="xsSemi" color={GENERAL_INK}>{t.restrictedGuidance}</AppText>
                      </Row>
                      <AppText variant="xs" color={GENERAL_INK} style={{ paddingBottom: 6 }}>
                        {t.restrictedWarning}
                      </AppText>
                    </View>
                  ) : msg.kind === 'general' ? (
                    <View style={styles.generalNotice}>
                      <Row gap={SPACING.xs + 2} style={{ paddingBottom: 4 }}>
                        <Icon name="sparkle" size={13} color={GENERAL_INK} />
                        <AppText variant="xsSemi" color={GENERAL_INK}>{t.generalGuidance}</AppText>
                      </Row>
                      <AppText variant="xs" color={GENERAL_INK} style={{ paddingBottom: 6 }}>
                        {t.notFromKnowledgeBase}
                      </AppText>
                    </View>
                  ) : null}
                  <Text style={styles.botCardText}>{msg.text}</Text>
                </FrostedCard>

                {msg.verdict ? <VerdictCard verdict={msg.verdict} /> : null}

                {rephraseNotice ? (
                  <View testID={`rephrase-notice-${msg.id}`} style={styles.rephraseNotice}>
                    <Row gap={SPACING.xs + 2} align="flex-start">
                      <Icon name="info" size={14} color={GENERAL_INK} />
                      <AppText variant="xs" color={GENERAL_INK} style={{ flex: 1 }}>
                        {rephraseNotice.text}
                      </AppText>
                    </Row>
                  </View>
                ) : null}
              </React.Fragment>
            );
          })}

          {pending ? (
            <View
              style={styles.botCard}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={t.titleAssistant}
              accessibilityState={{ busy: true }}
              accessibilityLiveRegion="polite"
              testID="typing-indicator"
            >
              <View style={styles.botCardHeader}>
                <Text style={styles.botCardTitle}>🌾 {t.assistantBotName}</Text>
              </View>
              <TypingIndicator />
            </View>
          ) : null}

          {props.onRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.retry}
              onPress={props.onRetry}
              style={styles.retry}
            >
              <Chip label={t.retry} tone="outline" icon="refresh" />
            </Pressable>
          ) : null}

          {messages.length > 0 && suggestions.length > 0 ? (
            <Row gap={SPACING.xs + 2} wrap style={{ paddingTop: SPACING.xs }}>
              {suggestions.map(s => (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityLabel={s}
                  onPress={() => props.onSuggestion?.(s)}
                >
                  <Chip label={s} tone="outline" />
                </Pressable>
              ))}
            </Row>
          ) : null}
        </ScrollView>

        {props.edgeSwipeHandlers ? (
          <View style={styles.edgeCatcher} {...props.edgeSwipeHandlers} />
        ) : null}
      </View>

      {/* 4. Composer Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          accessibilityRole={'textbox' as any}
          accessibilityLabel={t.message}
          style={styles.field}
          value={draft}
          onChangeText={props.onChangeDraft}
          placeholder={props.placeholder ?? (props.activeTitle ? (isFil ? 'Magtanong ukol sa pananim...' : 'Ask crop question...') : t.askPlaceholder)}
          placeholderTextColor={COLORS.textLight}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => { if (canSend) props.onSend(); }}
          blurOnSubmit={false}
          onKeyPress={(e: any) => {
            const native = e.nativeEvent;
            if (native?.key === 'Enter' && !native.shiftKey) {
              e.preventDefault?.();
              if (canSend) props.onSend();
            }
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.send}
          onPress={props.onSend}
          disabled={!canSend}
          accessibilityState={{ disabled: !canSend }}
          style={styles.sendTarget}
        >
          <LinearGradient
            colors={['#c2410c', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.sendGradient, !canSend && styles.sendOff]}
          >
            <Text style={styles.sendArrow}>➔</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function VerdictCard({ verdict }: { verdict: Suitability }) {
  const t = useT();
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
      <AppText testID="suitability-provisional-warning" variant="xs" color={GENERAL_INK}>
        {verdict.provisional !== false ? t.climateProvisionalWarning : t.climateNoCropRequirements}
      </AppText>
      {(verdict.missingFields?.length ?? 0) > 0 ? (
        <AppText variant="xs" color={GENERAL_INK}>
          {t.climateMissingEvidence((verdict.missingFields ?? []).map(field =>
            field === 'elevation' ? t.elevation
              : field === 'temperature' ? t.meanAnnualTemperature
                : field === 'rainfall' ? t.annualTotal
                  : field === 'crop requirements' ? t.climateCropRequirements
                    : t.climateHistoricalData,
          ).join(', '))}
        </AppText>
      ) : null}
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
      <Col gap={SPACING.xs}>
        <AppText variant="xs" color={COLORS.textSecondary}>
          {verdict.evidenceFetchedAt != null
            ? verdict.evidenceCached
              ? t.climateCachedEvidence(new Date(verdict.evidenceFetchedAt).toISOString().slice(0, 10))
              : t.climateEvidenceUpdated(new Date(verdict.evidenceFetchedAt).toISOString().slice(0, 10))
            : t.climateEvidenceDateUnavailable}
        </AppText>
        <AppText variant="xs" color={COLORS.textSecondary}>
          {verdict.evidencePeriod
            ? t.climateEvidencePeriod(verdict.evidencePeriod.fromYear, verdict.evidencePeriod.toYear)
            : t.climateEvidencePeriodUnavailable}
        </AppText>
        <AppText variant="xs" color={COLORS.textSecondary}>
          {verdict.evidenceSource
            ? t.climateHistoricalSource(verdict.evidenceSource)
            : t.climateEvidenceSourceUnavailable}
        </AppText>
      </Col>
      <AppText variant="xs" color={COLORS.textLight}>
        {verdict.basisLabel}
      </AppText>
      <AppText variant="xs" color={COLORS.textLight}>
        {verdict.sourceLabel}
      </AppText>
    </Card>
  );
}

const GENERAL_INK = '#8a4b00';

const styles = StyleSheet.create({
  topCell: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  drawerButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  drawerButtonIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerNewPill: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNewPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  safetyBannerWrapper: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  safetyBanner: {
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safetyIcon: {
    fontSize: 14,
  },
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starterButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  edgeCatcher: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    userSelect: 'none',
  },
  botCard: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 4,
    padding: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  botCardHeader: {
    marginBottom: 4,
  },
  botCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#154d2e',
  },
  botCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1f2937',
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: '#154d2e',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 4,
  },
  userBubbleText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  restrictedNotice: {
    borderColor: '#e8c99a',
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  generalNotice: {
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  rephraseNotice: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: '#fff7e9',
    borderWidth: 1,
    borderColor: '#e8c99a',
  },
  inputBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: '#f1f5f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendTarget: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: {
    opacity: 0.4,
  },
  sendArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  retry: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
  },
});
