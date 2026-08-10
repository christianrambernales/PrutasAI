import { TextStyle } from 'react-native';
import { COLORS, FONTS } from './theme';

export { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from './theme';

/** The type ramp. Sizes come from FONTS.sizes; line heights are set here. */
export const TEXT = {
  hero: { fontSize: FONTS.sizes.hero, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: FONTS.sizes.title, lineHeight: 34, fontWeight: '700' },
  xxl: { fontSize: FONTS.sizes.xxl, lineHeight: 30, fontWeight: '700' },
  xl: { fontSize: FONTS.sizes.xl, lineHeight: 26, fontWeight: '700' },
  lg: { fontSize: FONTS.sizes.lg, lineHeight: 22, fontWeight: '600' },
  md: { fontSize: FONTS.sizes.md, lineHeight: 21, fontWeight: '400' },
  mdSemi: { fontSize: FONTS.sizes.md, lineHeight: 20, fontWeight: '600' },
  sm: { fontSize: FONTS.sizes.sm, lineHeight: 18, fontWeight: '400' },
  smSemi: { fontSize: FONTS.sizes.sm, lineHeight: 18, fontWeight: '600' },
  xs: { fontSize: FONTS.sizes.xs, lineHeight: 14, fontWeight: '500' },
  xsSemi: { fontSize: FONTS.sizes.xs, lineHeight: 14, fontWeight: '600' },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof TEXT;

/** Severity and progress colours, keyed by the values the core layer emits. */
export const SEVERITY_COLOR = {
  early: COLORS.severityEarly,
  moderate: COLORS.severityModerate,
  severe: COLORS.severitySevere,
  undetermined: COLORS.textLight,
  healthy: COLORS.healthy,
} as const;

export const SEVERITY_LABEL = {
  early: 'Early',
  moderate: 'Moderate',
  severe: 'Severe',
  undetermined: 'Undetermined',
  healthy: 'Healthy',
} as const;

export type SeverityKey = keyof typeof SEVERITY_COLOR;
