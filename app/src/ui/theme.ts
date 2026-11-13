// PrutasAI Mobile App Theme & Design System
export const COLORS = {
  // Primary - deep forest green
  primary: '#154d2e',
  primaryLight: '#226b42',
  primaryDark: '#0b2b19',
  primarySurface: '#eaf4ed',

  // Accent - vibrant tropical hue
  accent: '#c2410c',
  accentLight: '#fef3c7',
  accentDark: '#9a3412',

  // Severity colors
  severityEarly: '#b45309',
  severityModerate: '#c2410c',
  severitySevere: '#b91c1c',
  healthy: '#166534',
  healthySurface: '#dcfce7',
  warningSurface: '#fef3c7',
  warningText: '#92400e',
  errorSurface: '#fee2e2',
  infoSurface: '#e0f2fe',
  focus: '#0284c7',

  // Progress status
  improving: '#166534',
  worsening: '#b91c1c',
  stable: '#0369a1',
  newDisease: '#9b2226',
  resolved: '#226b42',

  // Neutrals
  background: '#f2f6f3',
  surface: '#ffffff',
  surfaceAlt: '#eaf4ed',
  text: '#0f1d14',
  textSecondary: '#3f5246',
  textLight: '#4f6356',
  border: 'rgba(21, 77, 46, 0.14)',

  // Dark mode
  darkBg: '#0d1117',
  darkSurface: '#161b22',
  darkText: '#f0f6fc',
  darkBorder: '#30363d',

  // Alerts
  error: '#b91c1c',
  warning: '#b45309',
  success: '#166534',
  info: '#0369a1',
} as const;

export const FONTS = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
    hero: 34,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  card: 18,
  button: 14,
  full: 999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#0f2316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
