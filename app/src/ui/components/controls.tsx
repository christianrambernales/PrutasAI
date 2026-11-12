import React, { useState } from 'react';
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
          ? { backgroundColor: COLORS.warningSurface }
          : { backgroundColor: COLORS.surfaceAlt };

  const textColor =
    color ??
    (tone === 'selected' ? COLORS.surface : tone === 'warning' ? COLORS.warningText : tone === 'outline' ? COLORS.textSecondary : COLORS.primary);
  const constrainForNarrowRows = label.length > 24;

  return (
    <View style={[styles.chip, toneStyle, constrainForNarrowRows && styles.longChip]}>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      {icon ? <Icon name={icon} size={13} color={textColor} /> : null}
      <AppText variant="xsSemi" color={textColor} style={{ flexShrink: 1 }}>
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
  accessibilityLabel,
  onPress,
  variant = 'primary',
  icon,
  disabled,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  variant?: 'primary' | 'accent' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
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
        ? COLORS.surface
        : variant === 'danger'
          ? COLORS.surface
          : COLORS.primary;
  const pressedBg = variant === 'primary' ? COLORS.primaryDark
    : variant === 'accent' ? COLORS.accentDark : variant === 'secondary' ? COLORS.primarySurface : COLORS.error;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? pressedBg : bg, opacity: disabled ? 0.5 : 1 },
        variant === 'secondary' && { borderColor: COLORS.primary },
        focused && styles.focused,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <AppText variant="mdSemi" color={fg} center style={{ flexShrink: 1, fontWeight: variant === 'accent' ? '800' : '700' }}>
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
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.toggleTarget, focused && styles.focused]}
    >
      <View style={[styles.track, { backgroundColor: on ? COLORS.primary : COLORS.border }]}>
        <View style={[styles.knob, { left: on ? 18 : 2 }]} />
      </View>
    </Pressable>
  );
}

export function Segmented({
  options,
  value,
  onChange,
  fullWidth = false,
}: {
  options: Array<string | { value: string; label: string }>;
  value: string;
  onChange?: (v: string) => void;
  /** Give each option an equal share of a narrow parent container. */
  fullWidth?: boolean;
}) {
  const [focusedOption, setFocusedOption] = useState<string | null>(null);
  return (
    <Row style={[styles.segment, fullWidth && styles.segmentFullWidth]} gap={2}>
      {options.map(option => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        const active = optionValue === value;
        return (
          <Pressable
            key={optionValue}
            accessibilityRole="button"
            accessibilityLabel={optionLabel}
            accessibilityState={{ selected: active }}
            onPress={() => onChange?.(optionValue)}
            onFocus={() => setFocusedOption(optionValue)}
            onBlur={() => setFocusedOption(null)}
            style={[
              styles.segmentItem,
              fullWidth && styles.segmentItemFullWidth,
              active && styles.segmentItemActive,
              focusedOption === optionValue && styles.focused,
            ]}
          >
            <AppText variant="smSemi" color={active ? COLORS.primary : COLORS.textSecondary} center style={{ flexShrink: 1 }}>
              {optionLabel}
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
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? { disabled } : { selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [{ minHeight: 48, justifyContent: 'center', opacity: pressed && !disabled ? 0.7 : 1, borderWidth: 2, borderColor: 'transparent', borderRadius: RADIUS.md }, style, focused && styles.focused]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  longChip: { maxWidth: '50%' },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.button,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toggleTarget: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', borderRadius: RADIUS.sm },
  track: { width: 38, height: 22, borderRadius: RADIUS.full, justifyContent: 'center' },
  knob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
  },
  segment: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 4, flexWrap: 'wrap' },
  segmentFullWidth: { alignSelf: 'stretch' },
  segmentItem: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  segmentItemFullWidth: { flex: 1, minWidth: 0, alignItems: 'center' },
  segmentItemActive: { backgroundColor: COLORS.surface },
  focused: { borderColor: COLORS.focus },
});
