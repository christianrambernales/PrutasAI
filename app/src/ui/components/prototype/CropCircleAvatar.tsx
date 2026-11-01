import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export type CropType = 'mango' | 'banana' | 'papaya' | 'unknown' | string;

export interface CropCircleAvatarProps {
  crop?: CropType;
  emoji?: string;
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const CROP_EMOJIS: Record<string, string> = {
  mango: '🥭',
  banana: '🍌',
  papaya: '🍈',
};

export function CropCircleAvatar({
  crop,
  emoji,
  size = 40,
  backgroundColor = '#eaf4ed',
  style,
  testID,
}: CropCircleAvatarProps) {
  const displayEmoji = emoji ?? (crop ? CROP_EMOJIS[crop.toLowerCase()] ?? '🌱' : '🌱');
  const fontSize = Math.round(size * 0.48);

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={{ fontSize, textAlign: 'center', includeFontPadding: false }}>
        {displayEmoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
