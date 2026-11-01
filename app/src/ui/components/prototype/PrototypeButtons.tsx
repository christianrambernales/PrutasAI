import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../tokens';

export interface PrototypeButtonProps {
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export interface BtnSubtleProps extends PrototypeButtonProps {
  textColor?: string;
}

export function BtnOrangeFull({
  label,
  icon,
  onPress,
  disabled,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: PrototypeButtonProps) {
  const flattened = StyleSheet.flatten(style);
  const minHeight = flattened?.minHeight ?? 48;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.orangeContainer,
        { minHeight },
        style,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={['#c2410c', '#ea580c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientFill, { minHeight }]}
      >
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <Text style={[styles.orangeText, textStyle]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function BtnForestFull({
  label,
  icon,
  onPress,
  disabled,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: PrototypeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.forestButton,
        style,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={[styles.forestText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function BtnOutline({
  label,
  icon,
  onPress,
  disabled,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: PrototypeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.outlineButton,
        style,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={[styles.outlineText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function BtnSubtle({
  label,
  icon,
  onPress,
  disabled,
  style,
  textStyle,
  textColor,
  testID,
  accessibilityLabel,
}: BtnSubtleProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.subtleButton,
        style,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressedSubtle,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text
        style={[
          styles.subtleText,
          textColor ? { color: textColor } : null,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  orangeContainer: {
    width: '100%',
    borderRadius: 14,
    shadowColor: '#c2410c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  gradientFill: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  orangeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    textAlign: 'center',
  },
  forestButton: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#154d2e',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#154d2e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  forestText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  outlineButton: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#154d2e',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineText: {
    color: '#154d2e',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  subtleButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  subtleText: {
    color: '#3f5246',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  pressedSubtle: {
    opacity: 0.7,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
});
