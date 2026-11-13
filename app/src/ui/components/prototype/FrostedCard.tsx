import React from 'react';
import {
  AccessibilityRole,
  AccessibilityState,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

export type FrostedCardAccent =
  | 'forest'
  | 'orange'
  | 'amber'
  | 'healthy'
  | 'info'
  | 'severe'
  | 'dashed-orange'
  | 'none';

export interface FrostedCardProps {
  children?: React.ReactNode;
  accentBorder?: FrostedCardAccent;
  surfaceColor?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}

const ACCENT_STYLES: Record<Exclude<FrostedCardAccent, 'none'>, ViewStyle> = {
  forest: {
    borderLeftWidth: 4,
    borderLeftColor: '#154d2e',
  },
  orange: {
    borderLeftWidth: 4,
    borderLeftColor: '#c2410c',
  },
  amber: {
    borderLeftWidth: 4,
    borderLeftColor: '#b45309',
  },
  healthy: {
    borderLeftWidth: 4,
    borderLeftColor: '#166534',
  },
  info: {
    borderLeftWidth: 4,
    borderLeftColor: '#0369a1',
  },
  severe: {
    borderLeftWidth: 4,
    borderLeftColor: '#b91c1c',
  },
  'dashed-orange': {
    borderWidth: 1.5,
    borderColor: '#c2410c',
    borderStyle: 'dashed',
  },
};

export function FrostedCard({
  children,
  accentBorder = 'none',
  surfaceColor = '#ffffff',
  onPress,
  disabled,
  style,
  testID,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: FrostedCardProps) {
  const accentStyle = accentBorder !== 'none' ? ACCENT_STYLES[accentBorder] : null;

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: surfaceColor },
    accentStyle,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        testID={testID}
        style={({ pressed }) => [cardStyle, pressed && !disabled && styles.pressed, disabled && { opacity: 0.55 }]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(21, 77, 46, 0.14)',
    padding: 16,
    shadowColor: '#0f2316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  pressed: {
    opacity: 0.9,
  },
});
