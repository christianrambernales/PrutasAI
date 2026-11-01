import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../tokens';
import { Icon, IconName } from './Icon';
import { AppText, Col, Row } from './primitives';
import { useT } from '../i18n/LanguageContext';

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
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
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
  const t = useT();
  const [focused, setFocused] = useState<string | null>(null);
  return (
    <Row gap={SPACING.md - 4} style={styles.appBar}>
      {menu && onMenu ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t.openMenu} onPress={onMenu} onFocus={() => setFocused('menu')} onBlur={() => setFocused(null)} hitSlop={12} style={[styles.chromeAction, focused === 'menu' && styles.headerFocus]}>
          <Icon name={menu} size={24} color={COLORS.surface} />
        </Pressable>
      ) : null}
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t.goBack} onPress={onBack} onFocus={() => setFocused('back')} onBlur={() => setFocused(null)} hitSlop={12} style={[styles.chromeAction, focused === 'back' && styles.headerFocus]}>
          <Icon name="arrowLeft" size={24} color={COLORS.surface} />
        </Pressable>
      ) : null}
      <Col gap={4} style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="xl" color={COLORS.surface} accessibilityRole="header">{title}</AppText>
        {subtitle ? (
          <AppText variant="sm" color={COLORS.primarySurface}>
            {subtitle}
          </AppText>
        ) : null}
      </Col>
      {right}
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? (action === 'refresh' ? t.refreshClimate : action === 'search' ? t.searchScans : action === 'trash' ? t.trashRow : t.moreOptions)}
          onPress={onAction}
          onFocus={() => setFocused('action')}
          onBlur={() => setFocused(null)}
          hitSlop={12}
          style={[styles.chromeAction, focused === 'action' && styles.headerFocus]}
        >
          <Icon name={action} size={22} color={COLORS.surface} />
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
  const t = useT();
  return (
    <Row gap={SPACING.sm} style={styles.notice}>
      <Icon name="info" size={16} color={COLORS.surface} />
      <AppText variant="xs" color={COLORS.surface} style={{ flex: 1 }}>
        {message}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={t.dismiss} onPress={onDismiss} hitSlop={12} style={styles.chromeAction}>
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
  const t = useT();
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState<string | null>(null);
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
        onFocus={() => setFocused(tab.key)}
        onBlur={() => setFocused(null)}
        style={[styles.navItem, focused === tab.key && styles.navFocus]}
      >
        <View style={[styles.navPill, on && styles.navPillOn]}>
          <Icon name={tab.icon} size={22} color={on ? COLORS.primary : '#64748b'} />
        </View>
        <AppText
          variant={on ? 'xsSemi' : 'xs'}
          color={on ? COLORS.primary : '#64748b'}
          center
          style={[styles.navLabel, on && styles.navLabelActive]}
        >
          {tab.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    // The outer wrapper owns the system bottom inset once. The pill can grow
    // with translated/scaled labels and never covers the scrolling content.
    <View testID="bottom-nav" style={[styles.nav, { paddingBottom: insets.bottom + 14 }]}>
      <Row testID="bottom-nav-pill" align="stretch" style={styles.navRow}>
        {left.map(item)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.scanHeadline}
          onPress={onScan}
          onFocus={() => setFocused('scan')}
          onBlur={() => setFocused(null)}
          style={[styles.navItem, styles.centerScanContainer, focused === 'scan' && styles.navFocus]}
        >
          <LinearGradient
            testID="bottom-nav-fab"
            colors={['#c2410c', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Icon name="camera" size={25} color="#ffffff" />
          </LinearGradient>
          <AppText
            variant="xsSemi"
            color="#64748b"
            center
            style={[styles.navLabel, styles.centerScanLabel]}
          >
            {t.tabScan}
          </AppText>
        </Pressable>
        {right.map(item)}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.primary },
  body: { flex: 1 },
  bodyContent: { paddingBottom: SPACING.lg, backgroundColor: COLORS.background, flexGrow: 1 },
  appBar: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  chromeAction: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', borderRadius: RADIUS.button },
  headerFocus: { borderColor: COLORS.surface },
  navFocus: { borderColor: COLORS.focus },
  nav: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingTop: 20,
  },
  notice: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.md - 4,
    paddingVertical: SPACING.sm + 2,
  },
  navRow: {
    height: 64,
    minHeight: 64,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(21, 77, 46, 0.12)',
    shadowColor: '#0f2316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  navItem: { flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2, borderRadius: RADIUS.button, borderWidth: 2, borderColor: 'transparent' },
  navLabel: {
    alignSelf: 'stretch',
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  navLabelActive: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  centerScanContainer: { minHeight: 48 },
  centerScanLabel: {
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
  },
  navPill: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  navPillOn: { backgroundColor: '#eaf4ed' },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -24,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#c2410c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#c2410c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
});
