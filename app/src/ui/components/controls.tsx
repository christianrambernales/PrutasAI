import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SEVERITY_COLOR, SEVERITY_LABEL, SeverityKey, SPACING } from '../tokens';
import { Icon, IconName } from './Icon';
import { AppText, Row } from './primitives';

/** A pill. `tone` picks the surface; `dotColor` adds a leading status dot. */
export function Chip({
  label,
  dotColor,
  tone = 'solid',
  icon,
  color,
}: {
  label: string;
  dotColor?: string;
  tone?: 'solid' | 'outline' | 'selected' | 'warning';
  icon?: IconName;
  color?: string;
}) {
  const toneStyle: ViewStyle =
    tone === 'outline'
      ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border }
      : tone === 'selected'
        ? { backgroundColor: COLORS.primary }
        : tone === 'warning'
          ? { backgroundColor: '#fdf1e3' }
          : { backgroundColor: COLORS.surfaceAlt };

  const textColor =
    color ??
    (tone === 'selected' ? COLORS.surface : tone === 'warning' ? '#8a4b00' : tone === 'outline' ? COLORS.textSecondary : COLORS.text);

  return (
    <View style={[styles.chip, toneStyle]}>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      {icon ? <Icon name={icon} size={13} color={textColor} /> : null}
      <AppText variant="xs" color={textColor}>
        {label}
      </AppText>
    </View>
  );
}

/** Chip whose colour and wording come from a severity value the core layer emits. */
export function StatusChip({ status, label }: { status: SeverityKey; label?: string }) {
  return <Chip label={label ?? SEVERITY_LABEL[status]} dotColor={SEVERITY_COLOR[status]} />;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'accent' | 'secondary' | 'danger';
  icon?: IconName;
}) {
  const bg =
    variant === 'primary'
      ? COLORS.primary
      : variant === 'accent'
        ? COLORS.accent
        : variant === 'danger'
          ? COLORS.error
          : COLORS.surface;
  const fg =
    variant === 'primary'
      ? COLORS.surface
      : variant === 'accent'
        ? COLORS.primaryDark
        : variant === 'danger'
          ? COLORS.surface
          : COLORS.text;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: COLORS.border },
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <AppText variant="mdSemi" color={fg}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Toggle({
  on,
  onPress,
  accessibilityLabel,
}: {
  on: boolean;
  onPress?: () => void;
  /** Required in practice: the switch sits beside its label, never inside it. */
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.track, { backgroundColor: on ? COLORS.primary : COLORS.border }]}
    >
      <View style={[styles.knob, { left: on ? 18 : 2 }]} />
    </Pressable>
  );
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange?: (v: string) => void;
}) {
  return (
    <Row style={styles.segment} gap={2}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange?.(opt)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <AppText variant="xsSemi" color={active ? COLORS.primary : COLORS.textSecondary}>
              {opt}
            </AppText>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Tappable row that reveals a chevron — used by lists that drill down. */
export function PressableRow({
  onPress,
  children,
  style,
  accessibilityLabel,
  selected,
  disabled,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
  /** Surfaces selection to assistive tech and to the interaction tests. */
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? { disabled } : { selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed && !disabled ? 0.7 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg - 4,
    borderRadius: RADIUS.full,
  },
  track: { width: 38, height: 22, borderRadius: RADIUS.full, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
  },
  segment: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, padding: 3 },
  segmentItem: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: RADIUS.full },
  segmentItemActive: { backgroundColor: COLORS.surface },
});
