import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { FONTS } from '../../tokens';

export type StatusBadgeVariant =
  | 'offline'
  | 'sample'
  | 'healthy'
  | 'warning'
  | 'info'
  | 'severe';

export interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

const VARIANT_STYLES: Record<
  StatusBadgeVariant,
  { bg: string; text: string; borderColor?: string; borderWidth?: number }
> = {
  offline: {
    bg: '#e2e8f0',
    text: '#334155',
  },
  sample: {
    bg: '#fef3c7',
    text: '#92400e',
    borderColor: '#fde68a',
    borderWidth: 1,
  },
  healthy: {
    bg: '#dcfce7',
    text: '#166534',
  },
  warning: {
    bg: '#ffedd5',
    text: '#9a3412',
  },
  info: {
    bg: '#e0f2fe',
    text: '#0369a1',
  },
  severe: {
    bg: '#fee2e2',
    text: '#b91c1c',
  },
};

export function StatusBadge({
  label,
  variant = 'offline',
  style,
  textStyle,
  testID,
}: StatusBadgeProps) {
  const config = VARIANT_STYLES[variant] ?? VARIANT_STYLES.offline;

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        config.borderColor ? { borderColor: config.borderColor, borderWidth: config.borderWidth ?? 1 } : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
});
