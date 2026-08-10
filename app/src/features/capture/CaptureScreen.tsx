import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppText, COLORS, Icon, RADIUS, Row, SPACING } from '../../ui';

export interface CaptureScreenProps {
  onClose: () => void;
  onCapture: () => void;
  onPickImage: () => void;
  onFlip: () => void;
  /** Stand-in for the live preview until expo-camera is wired in. */
  previewEmoji?: string;
}

/**
 * Camera viewfinder. Deliberately full-bleed: no app bar and no bottom
 * navigation, so the frame is the whole screen.
 */
export function CaptureScreen(props: CaptureScreenProps) {
  return (
    <View style={styles.root}>
      <Row justify="space-between" style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close camera" onPress={props.onClose} hitSlop={10}>
          <Icon name="close" size={24} color={COLORS.surface} />
        </Pressable>
        <AppText variant="mdSemi" color={COLORS.surface}>Scan a fruit</AppText>
        <Icon name="sparkle" size={22} color={COLORS.accentLight} />
      </Row>

      <View style={styles.viewfinder}>
        <View style={styles.brackets}>
          <View style={[styles.bracket, styles.tl]} />
          <View style={[styles.bracket, styles.tr]} />
          <View style={[styles.bracket, styles.bl]} />
          <View style={[styles.bracket, styles.br]} />
        </View>
        <Text style={styles.subject}>{props.previewEmoji ?? '🍌'}</Text>
        <View style={styles.hint}>
          <AppText variant="xs" color={COLORS.surface}>Center the fruit in the frame</AppText>
        </View>
      </View>

      <Row gap={SPACING.sm} justify="center" style={{ paddingTop: 14 }}>
        <Icon name="shield" size={14} color="rgba(255,255,255,0.62)" />
        <AppText variant="xs" color="rgba(255,255,255,0.62)">
          Runs on your phone · nothing is uploaded
        </AppText>
      </Row>

      <Row justify="space-between" style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo" onPress={props.onPickImage} style={styles.thumb}>
          <Icon name="image" size={22} color={COLORS.surface} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={props.onCapture} style={styles.shutter}>
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Flip camera" onPress={props.onFlip} hitSlop={10}>
          <Icon name="refresh" size={26} color={COLORS.surface} />
        </Pressable>
      </Row>
    </View>
  );
}

const BRACKET = 30;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0d0c' },
  top: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm + 2,
  },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131715',
    overflow: 'hidden',
  },
  brackets: { position: 'absolute', width: 212, height: 212 },
  bracket: {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
    borderColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2.5,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  subject: { fontSize: 96 },
  hint: {
    position: 'absolute',
    bottom: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  controls: { paddingHorizontal: 30, paddingTop: SPACING.md, paddingBottom: 14 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: '#232825',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.surface },
});
