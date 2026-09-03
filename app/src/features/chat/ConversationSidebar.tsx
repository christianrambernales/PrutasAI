import React, { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Col, COLORS, Icon, PressableRow, SPACING, useT } from '../../ui';
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

const WIDTH = 280;

export function ConversationSidebar(props: ConversationSidebarProps) {
  const t = useT();
  const translate = useRef(new Animated.Value(props.visible ? 0 : -WIDTH)).current;

  React.useEffect(() => {
    Animated.timing(translate, { toValue: props.visible ? 0 : -WIDTH, duration: 220, useNativeDriver: true }).start();
  }, [props.visible, translate]);

  if (!props.visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={props.onClose} accessibilityLabel="Close menu" />
      <Animated.View style={[styles.panel, { transform: [{ translateX: translate }] }]}>
        <PressableRow onPress={() => { props.onNew(); props.onClose(); }}>
          <Icon name="plus" size={18} />
          <AppText variant="mdSemi">{t.newConversation}</AppText>
        </PressableRow>

        <Col gap={0} style={{ flex: 1 }}>
          {props.conversations.length === 0 ? (
            <AppText variant="sm" color={COLORS.textSecondary} style={{ padding: SPACING.md }}>
              {t.noConversationsYet}
            </AppText>
          ) : (
            props.conversations.map((c, i) => (
              // Descending z-index, so an earlier row's "..." dropdown paints
              // over the rows beneath it. Without this the dropdown is trapped:
              // react-native-web gives every View `z-index: 0`, and a positioned
              // element with a numeric z-index creates a stacking context, so
              // the menu's own `zIndex: 10` can never lift it out of its row —
              // the next row, a later sibling, covered "Rename" entirely and
              // swallowed the tap.
              <View key={c.uuid} style={[styles.row, { zIndex: props.conversations.length - i }]}>
                <PressableRow
                  onPress={() => { props.onSelect(c.uuid); props.onClose(); }}
                  style={{ flex: 1 }}
                >
                  <AppText
                    variant={c.uuid === props.activeId ? 'smSemi' : 'sm'}
                    numberOfLines={1}
                  >
                    {c.title}
                  </AppText>
                </PressableRow>
                <ConversationRowMenu
                  onRename={title => props.onRename(c.uuid, title)}
                  onDelete={() => props.onDelete(c.uuid)}
                  currentTitle={c.title}
                />
              </View>
            ))
          )}
        </Col>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: WIDTH,
    backgroundColor: COLORS.surface, paddingTop: SPACING.xl, paddingHorizontal: SPACING.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs },
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
