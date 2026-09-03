import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, COLORS, Icon, RADIUS, Row, SPACING, useT } from '../../ui';

export interface CaptureScreenProps {
  onClose: () => void;
  onCapture: () => void;
  onPickImage: () => void;
  onFlip: () => void;
  /**
   * The live camera preview, supplied by the container. Kept as a node so this
   * screen stays presentational and testable without a camera.
   */
  preview?: React.ReactNode;
  /** False while permission is pending or denied — the shutter is disabled. */
  canCapture?: boolean;
  /** True while a photo is being written. */
  busy?: boolean;
}

/**
 * Camera viewfinder. Deliberately full-bleed: no app bar and no bottom
 * navigation, so the frame is the whole screen.
 */
export function CaptureScreen(props: CaptureScreenProps) {
  const t = useT();
  const canCapture = props.canCapture !== false && !props.busy;
  // This screen bypasses <Screen>, so it insets itself: without this the close
  // button sits under the status bar and the shutter under the gesture bar.
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Row justify="space-between" style={[styles.top, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close camera" onPress={props.onClose} hitSlop={10}>
          <Icon name="close" size={24} color={COLORS.surface} />
        </Pressable>
        <AppText variant="mdSemi" color={COLORS.surface}>Scan a fruit</AppText>
        <Icon name="sparkle" size={22} color={COLORS.accentLight} />
      </Row>

      <View style={styles.viewfinder}>
        {props.preview}
        <View style={styles.brackets} pointerEvents="none">
          <View style={[styles.bracket, styles.tl]} />
          <View style={[styles.bracket, styles.tr]} />
          <View style={[styles.bracket, styles.bl]} />
          <View style={[styles.bracket, styles.br]} />
        </View>
        <View style={styles.hint} pointerEvents="none">
          <AppText variant="xs" color={COLORS.surface}>Center the fruit in the frame</AppText>
        </View>
      </View>

      <Row gap={SPACING.sm} justify="center" style={{ paddingTop: 14 }}>
        <Icon name="shield" size={14} color="rgba(255,255,255,0.62)" />
        <AppText variant="xs" color="rgba(255,255,255,0.62)">
          {t.captureOnDevice}
        </AppText>
      </Row>

      <Row justify="space-between" style={[styles.controls, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo" onPress={props.onPickImage} style={styles.thumb}>
          <Icon name="image" size={22} color={COLORS.surface} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          accessibilityState={{ disabled: !canCapture }}
          disabled={!canCapture}
          onPress={props.onCapture}
          style={[styles.shutter, !canCapture && styles.shutterOff]}
        >
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
  shutterOff: { opacity: 0.4 },
  shutterInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.surface },
});
