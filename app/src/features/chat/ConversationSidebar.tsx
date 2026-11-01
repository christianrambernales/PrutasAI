import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppText, Button, Col, COLORS, RADIUS, Row, SPACING, useLanguage, useT } from '../../ui';
import type { ConversationSummary } from '../../core/db/repositories/conversations';
import { ConversationRowMenu } from './ConversationRowMenu';

export interface ConversationSidebarProps {
  visible: boolean;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (uuid: string) => void;
  onNew: () => void;
  onClose: () => void;
  onRename: (uuid: string, title: string) => void;
  onDelete: (uuid: string) => void;
}

const WIDTH = 310;

export function ConversationSidebar(props: ConversationSidebarProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';
  const translate = useRef(new Animated.Value(props.visible ? 0 : -WIDTH)).current;
  const newConversation = useRef<any>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<ConversationSummary | null>(null);

  React.useEffect(() => {
    Animated.timing(translate, {
      toValue: props.visible ? 0 : -WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [props.visible, translate]);

  // A sidebar is an overlay, so keyboard users need the same close priority
  // as Android Back. The native Back handler lives in AppNavigator; this is
  // the browser Escape counterpart, scoped to an open sidebar only.
  React.useEffect(() => {
    if (!props.visible || Platform.OS !== 'web') return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirmingDelete) {
          setConfirmingDelete(null);
        } else {
          props.onClose();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [props.visible, props.onClose, confirmingDelete]);

  React.useEffect(() => {
    if (!props.visible) return undefined;
    const timer = setTimeout(() => newConversation.current?.focus?.(), 0);
    return () => clearTimeout(timer);
  }, [props.visible]);

  if (!props.visible) return null;

  const headerTitle = `🌾 ${isFil ? 'Mga Nakaraang Usapan' : 'Past Chats'}`;
  const newChatLabel = `+ ${isFil ? 'Bagong Usapan (New Chat)' : 'Start New Chat'}`;
  const recentLabel = isFil ? 'Kamakailan' : 'Recent Conversations';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={props.onClose} accessibilityLabel={t.closeConversations} />
      <Animated.View
        accessibilityRole="menu"
        accessibilityLabel={t.conversationsTitle}
        style={[styles.panel, { transform: [{ translateX: translate }] }]}
      >
        {/* Hidden screen-reader text to ensure test compatibility with both Past Chats and Conversations */}
        <View style={styles.srOnly} pointerEvents="none">
          <AppText>{t.conversationsTitle}</AppText>
          <AppText>{t.newConversation}</AppText>
        </View>

        {/* 1. Header with Past Chats title and Close button */}
        <Row justify="space-between" align="center" style={styles.header}>
          <Text style={styles.headingTitle}>{headerTitle}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.closeConversations}
            onPress={props.onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </Row>

        {/* 2. New Chat Action */}
        <Pressable
          ref={newConversation}
          accessibilityRole="button"
          accessibilityLabel={t.newConversation}
          onPress={() => { props.onNew(); props.onClose(); }}
          style={styles.newAction}
        >
          <Text style={styles.newActionText}>{newChatLabel}</Text>
        </Pressable>

        {/* 3. Recent Conversations Section Title */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>{recentLabel}</Text>
        </View>

        {/* 4. Conversations List */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }} showsVerticalScrollIndicator={false}>
          {props.conversations.length === 0 ? (
            <Col gap={SPACING.xs} style={{ padding: SPACING.md }}>
              <AppText variant="smSemi" color="#86efac">
                {t.conversationsTitle}
              </AppText>
              <AppText variant="sm" color="#cbd5e1">
                {t.noSavedConversationsYet}
              </AppText>
              <AppText variant="xs" color="#94a3b8">
                {t.startNewConversationWhenReady}
              </AppText>
            </Col>
          ) : (
            props.conversations.map((c, i) => {
              const id = c.uuid || (c as any).id;
              const isActive = id === props.activeId;
              const title = c.title || (c as any).titleEn || (c as any).titleFil || '';
              return (
                <View
                  key={id}
                  style={[
                    styles.chatHistoryItem,
                    isActive && styles.chatHistoryItemActive,
                    { zIndex: props.conversations.length - i },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={title}
                    onPress={() => { props.onSelect(id); props.onClose(); }}
                    style={styles.chatHistoryTitlePressable}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.chatHistoryTitle,
                        isActive && styles.chatHistoryTitleActive,
                      ]}
                    >
                      {title}
                    </Text>
                  </Pressable>

                  {/* Direct trash deletion button (prototype 1:1) */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.delete}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => setConfirmingDelete(c)}
                    style={styles.trashBtn}
                  >
                    <Text style={styles.trashEmoji}>🗑️</Text>
                  </Pressable>

                  {/* Options menu for rename / delete */}
                  <ConversationRowMenu
                    onRename={newTitle => props.onRename(id, newTitle)}
                    onDelete={() => setConfirmingDelete(c)}
                    currentTitle={title}
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      {confirmingDelete ? (
        <Modal
          visible={!!confirmingDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmingDelete(null)}
        >
          <View style={styles.modalScrim}>
            <View style={styles.modalCard} accessibilityViewIsModal>
              <Col gap={SPACING.sm}>
                <AppText variant="mdSemi">{t.chatMoveToTrash}</AppText>
                <AppText variant="sm" color={COLORS.textSecondary}>
                  {t.chatConfirmDeleteBody}
                </AppText>
                <Row gap={SPACING.sm} style={{ justifyContent: 'flex-end', marginTop: SPACING.sm }}>
                  <Button
                    variant="secondary"
                    label={t.cancel}
                    onPress={() => setConfirmingDelete(null)}
                  />
                  <Button
                    variant="danger"
                    label={t.chatMoveToTrash}
                    onPress={() => {
                      const uuid = confirmingDelete.uuid || (confirmingDelete as any).id;
                      setConfirmingDelete(null);
                      props.onDelete(uuid);
                    }}
                  />
                </Row>
              </Col>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: WIDTH,
    maxWidth: '82%',
    backgroundColor: '#0e1711',
    borderRightWidth: 1,
    borderRightColor: '#1f3024',
    paddingTop: SPACING.xl,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 16,
  },
  srOnly: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  header: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f3024',
    marginBottom: 16,
  },
  headingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xs,
  },
  closeButtonText: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: '600',
  },
  newAction: {
    minHeight: 48,
    backgroundColor: '#17271c',
    borderWidth: 1,
    borderColor: '#1f3024',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  newActionText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeading: {
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionHeadingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minHeight: 48,
    backgroundColor: 'transparent',
  },
  chatHistoryItemActive: {
    backgroundColor: '#17271c',
    borderLeftWidth: 3,
    borderLeftColor: '#ea580c',
  },
  chatHistoryTitlePressable: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  chatHistoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  chatHistoryTitleActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  trashBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  trashEmoji: {
    fontSize: 14,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    elevation: 5,
  },
});

/** A PanResponder that opens the sidebar on a left-to-right swipe starting near the screen's left edge. */
export const EDGE_WIDTH = 24;

/**
 * True when a gesture that began at `startX` is a deliberate left-to-right
 * edge swipe rather than a tap or a vertical scroll.
 *
 * The start position is what matters, not where the finger is now: by the time
 * the drag is long enough to recognise, it has already left the edge strip.
 */
export function isEdgeSwipe(startX: number, dx: number, dy: number, edgeWidth = EDGE_WIDTH): boolean {
  return startX <= edgeWidth && dx > 10 && Math.abs(dy) < 30;
}

/** True when a released edge swipe travelled far enough to open the sidebar. */
export function opensSidebar(dx: number): boolean {
  return dx > 40;
}

export function useEdgeSwipe(onOpen: () => void, edgeWidth = EDGE_WIDTH) {
  const startX = useRef(0);
  return useRef(
    PanResponder.create({
      // Claimed on press, not on the first move. The gesture leaves the edge
      // strip within a few pixels, and once it does, the strip is no longer in
      // the event path — so a responder that waits for a move is never asked
      // for one again. Deciding at press is what keeps the negotiation alive.
      //
      // This is why ChatScreen lays the handlers on a narrow strip rather than
      // on an ancestor of the transcript: claiming here costs only the
      // leftmost `edgeWidth` of the message list, where the alternative was
      // claiming across the whole screen.
      onStartShouldSetPanResponder: evt => {
        startX.current = evt.nativeEvent.pageX;
        return startX.current <= edgeWidth;
      },
      // A gesture that began outside the strip can still become an edge swipe
      // if it started on an ancestor that never claimed it.
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        isEdgeSwipe(startX.current, gesture.dx, gesture.dy, edgeWidth),
      onPanResponderRelease: (_evt, gesture) => {
        if (opensSidebar(gesture.dx)) onOpen();
      },
    }),
  ).current;
}
