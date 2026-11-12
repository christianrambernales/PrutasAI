import React, { createContext, useContext } from 'react';
import { StyleSheet, Text, TextProps, View, ViewProps, ViewStyle } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, TEXT, TextVariant } from '../tokens';

const FontsLoaded = createContext(false);
export const FontProvider = FontsLoaded.Provider;

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

export function AppText({ variant = 'md', color = COLORS.text, center, style, ...rest }: AppTextProps) {
  const fontsLoaded = useContext(FontsLoaded);
  const overrides = StyleSheet.flatten(style);
  const weight = String(overrides?.fontWeight ?? TEXT[variant].fontWeight);
  const fontFamily = weight === '800' || weight === '900' ? FONTS.extraBold
    : weight === '700' || weight === 'bold' ? FONTS.bold
      : weight === '600' ? FONTS.semiBold : weight === '500' ? FONTS.medium : FONTS.regular;
  // Each static face has its own family; avoid synthetic weight on native.
  const loadedFace = fontsLoaded && !overrides?.fontFamily ? { fontFamily, fontWeight: 'normal' as const } : null;
  return <Text {...rest} style={[TEXT[variant], { color }, center && { textAlign: 'center' }, style, loadedFace]} />;
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
    <Row justify="space-between" align="baseline" gap={SPACING.sm} wrap>
      <AppText variant="lg" accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</AppText>
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
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  tile: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
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
