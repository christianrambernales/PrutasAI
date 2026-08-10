import React from 'react';
import { StyleSheet, Text, TextProps, View, ViewProps, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TEXT, TextVariant } from '../tokens';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

export function AppText({ variant = 'md', color = COLORS.text, center, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[TEXT[variant], { color }, center && { textAlign: 'center' }, style]} />;
}

interface StackProps extends ViewProps {
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
}

export function Row({ gap = 0, align = 'center', justify, wrap, style, ...rest }: StackProps) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: 'row', alignItems: align, gap },
        justify ? { justifyContent: justify } : null,
        wrap ? { flexWrap: 'wrap' } : null,
        style,
      ]}
    />
  );
}

export function Col({ gap = 0, align, justify, style, ...rest }: StackProps) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: 'column', gap },
        align ? { alignItems: align } : null,
        justify ? { justifyContent: justify } : null,
        style,
      ]}
    />
  );
}

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

export function Tile({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.tile, style]} />;
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

/** Circular or rounded container for a fruit emoji. */
export function EmojiBadge({ emoji, size = 48, square = false }: { emoji: string; size?: number; square?: boolean }) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: square ? RADIUS.sm : size / 2 },
      ]}
    >
      <Text style={{ fontSize: Math.round(size * 0.46) }}>{emoji}</Text>
    </View>
  );
}

/** Full-width section wrapper with the standard 16dp gutter. */
export function Section({ gap = SPACING.sm, style, ...rest }: StackProps) {
  return <Col gap={gap} {...rest} style={[styles.section, style]} />;
}

export function SectionHeader({ title, meta, metaColor }: { title: string; meta?: string; metaColor?: string }) {
  return (
    <Row justify="space-between" align="baseline" gap={SPACING.sm}>
      <AppText variant="lg">{title}</AppText>
      {meta ? (
        <AppText variant={metaColor ? 'smSemi' : 'xs'} color={metaColor ?? COLORS.textSecondary}>
          {meta}
        </AppText>
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md - 4,
    ...SHADOWS.sm,
  },
  tile: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm + 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: COLORS.border,
  },
  badge: {
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
});
