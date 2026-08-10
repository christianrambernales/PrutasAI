import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, ViewProps } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../tokens';
import { Icon, IconName } from './Icon';
import { AppText, Col, Row } from './primitives';

/** Screen background. Children that should scroll go in <ScreenBody>. */
export function Screen({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.screen, style]} />;
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
  onAction,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: IconName;
  onAction?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Row gap={SPACING.md - 4} style={styles.appBar}>
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
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Icon name={action} size={22} color={COLORS.textSecondary} />
        </Pressable>
      ) : null}
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
    <View style={styles.nav}>
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
