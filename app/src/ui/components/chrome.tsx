import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../tokens';
import { Icon, IconName } from './Icon';
import { AppText, Col, Row } from './primitives';

/**
 * Screen background, inset from the status bar. `SafeAreaView` from react-native
 * is iOS-only — on Android, the target platform, it is a plain View — so the top
 * inset is taken from react-native-safe-area-context instead.
 */
export function Screen({ style, ...rest }: ViewProps) {
  const insets = useSafeAreaInsets();
  return <View {...rest} style={[styles.screen, { paddingTop: insets.top }, style]} />;
}

export function ScreenBody({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function AppBar({
  title,
  subtitle,
  onBack,
  action,
  actionLabel,
  onAction,
  menu,
  onMenu,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: IconName;
  /** Names the action for assistive tech; an icon alone announces nothing. */
  actionLabel?: string;
  onAction?: () => void;
  /** A persistent leading icon independent of onBack — e.g. the chat sidebar's menu button. */
  menu?: IconName;
  onMenu?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Row gap={SPACING.md - 4} style={styles.appBar}>
      {menu && onMenu ? (
        <Pressable accessibilityRole="button" accessibilityLabel="menu" onPress={onMenu} hitSlop={8}>
          <Icon name={menu} size={24} />
        </Pressable>
      ) : null}
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={8}>
          <Icon name="arrowLeft" size={24} />
        </Pressable>
      ) : null}
      <Col gap={2} style={{ flex: 1 }}>
        <AppText variant="lg">{title}</AppText>
        {subtitle ? (
          <AppText variant="xs" color={COLORS.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </Col>
      {right}
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? action}
          onPress={onAction}
          hitSlop={8}
        >
          <Icon name={action} size={22} color={COLORS.textSecondary} />
        </Pressable>
      ) : null}
    </Row>
  );
}

/**
 * Transient feedback strip. Used where a control's backing service does not
 * exist yet: pressing it must still say something truthful rather than appear
 * broken.
 */
export function NoticeBar({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Row gap={SPACING.sm} style={styles.notice}>
      <Icon name="info" size={16} color={COLORS.surface} />
      <AppText variant="xs" color={COLORS.surface} style={{ flex: 1 }}>
        {message}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={8}>
        <Icon name="close" size={16} color={COLORS.surface} />
      </Pressable>
    </Row>
  );
}

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
}

export function BottomNav({
  tabs,
  active,
  onSelect,
  onScan,
}: {
  tabs: TabItem[];
  active: string;
  onSelect: (key: string) => void;
  onScan: () => void;
}) {
  const insets = useSafeAreaInsets();
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  const item = (tab: TabItem) => {
    const on = tab.key === active;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={tab.label}
        onPress={() => onSelect(tab.key)}
        style={styles.navItem}
      >
        <View style={[styles.navPill, on && styles.navPillOn]}>
          <Icon name={tab.icon} size={22} color={on ? COLORS.primary : COLORS.textSecondary} />
        </View>
        <AppText variant={on ? 'xsSemi' : 'xs'} color={on ? COLORS.primary : COLORS.textSecondary}>
          {tab.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    // The surface itself extends under the gesture bar, rather than floating
    // above a strip of page background.
    <View style={[styles.nav, { paddingBottom: insets.bottom }]}>
      <Row style={styles.navRow}>
        {left.map(item)}
        <Pressable accessibilityRole="button" accessibilityLabel="Scan a fruit" onPress={onScan} style={styles.navItem}>
          <View style={styles.fab}>
            <Icon name="camera" size={26} color={COLORS.primaryDark} />
          </View>
          <AppText variant="xs" color={COLORS.textSecondary}>
            Scan
          </AppText>
        </Pressable>
        {right.map(item)}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1 },
  bodyContent: { paddingBottom: SPACING.lg },
  appBar: {
    paddingLeft: SPACING.md - 4,
    paddingRight: SPACING.md,
    paddingTop: SPACING.sm + 2,
    paddingBottom: SPACING.md - 4,
  },
  nav: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notice: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.md - 4,
    paddingVertical: SPACING.sm + 2,
  },
  navRow: {
    paddingTop: SPACING.sm + 2,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navPill: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.full },
  // A tint, not a token colour: variable-alpha fills are not in the palette.
  navPillOn: { backgroundColor: 'rgba(26,71,42,0.14)' },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
});
