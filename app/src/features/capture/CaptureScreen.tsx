import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Col, COLORS, Icon, RADIUS, Row, SPACING, useLanguage, useT } from '../../ui';

export interface CaptureScreenProps {
  onClose: () => void;
  onCapture: () => void;
  onPickImage?: () => void;
  onPickGallery?: () => void;
  onFlip?: () => void;
  onFlipCamera?: () => void;
  activeCamera?: 'back' | 'front';
  onToggleFlash?: () => void;
  flashMode?: 'off' | 'on' | 'auto';
  /**
   * The live camera preview, supplied by the container. Kept as a node so this
   * screen stays presentational and testable without a camera.
   */
  preview?: React.ReactNode;
  /** False while permission is pending or denied — the shutter is disabled. */
  canCapture?: boolean;
  /** True while a photo is being written. */
  busy?: boolean;
  /** Present if saving the photo failed. */
  error?: string | null;
  /** Triggered when the user wants to retry after an error. */
  onRetry?: () => void;
}

/**
 * Camera viewfinder aligned with prototype v2 composition (Screen 2).
 * Dark container #0c140e with 24px border radius, top controls (✕, On-Device Only, ⚡),
 * dashed green target reticle with guidance copy, and bottom shutter bar (🖼️, 76px shutter, 🔄).
 */
export function CaptureScreen(props: CaptureScreenProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';
  const canCapture = props.canCapture !== false && !props.busy && !props.error;
  const insets = useSafeAreaInsets();

  const handlePickGallery = () => {
    if (props.onPickGallery) {
      props.onPickGallery();
    }
    if (props.onPickImage && props.onPickImage !== props.onPickGallery) {
      props.onPickImage();
    }
  };

  const handleFlipCamera = () => {
    if (props.onFlipCamera) {
      props.onFlipCamera();
    }
    if (props.onFlip && props.onFlip !== props.onFlipCamera) {
      props.onFlip();
    }
  };

  const frameHeading = isFil
    ? 'Itapat ang prutas sa gitna ng frame'
    : 'Center the fruit within the frame';
  const frameSubtitle = isFil
    ? 'Siguraduhing maliwanag at kitang-kita ang balat o sugat'
    : 'Ensure natural lighting and steady focus on lesions';

  return (
    <View style={styles.root}>
      {/* Live Preview (fills entire container behind overlays) */}
      <View style={styles.viewfinder}>
        {props.preview}
      </View>

      {/* Top Controls: Close (✕) left, On-Device Only badge (center), Flash toggle (⚡) right */}
      <Row justify="space-between" align="center" style={[styles.top, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.captureCloseCamera}
          accessibilityState={{ disabled: Boolean(props.busy) }}
          onPress={props.onClose}
          hitSlop={10}
          disabled={props.busy}
          style={[styles.topButton, props.busy && styles.controlDisabled]}
        >
          <AppText style={styles.topButtonText}>✕</AppText>
        </Pressable>

        <View style={styles.onDeviceBadge}>
          <AppText style={styles.onDeviceBadgeText}>
            {isFil ? '🔒 Lokal na Device Lamang' : '🔒 On-Device Only'}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.captureFlash ?? 'Toggle flash'}
          accessibilityState={{ disabled: Boolean(props.busy) }}
          onPress={props.onToggleFlash}
          hitSlop={10}
          disabled={props.busy}
          style={[styles.topButton, props.busy && styles.controlDisabled]}
        >
          <AppText style={[styles.flashIconText, props.flashMode === 'off' && styles.flashOff]}>
            ⚡
          </AppText>
        </Pressable>
      </Row>

      {/* Target Reticle Frame / Error Overlay */}
      {props.error ? (
        <View style={styles.errorOverlay}>
          <Col gap={SPACING.md} align="center">
            <Icon name="warning" size={32} color={COLORS.surface} />
            <AppText accessibilityRole="alert" variant="mdSemi" color={COLORS.surface} center>
              {props.error}
            </AppText>
            <Row gap={SPACING.md} wrap>
              <Button label={t.captureRetry} variant="accent" onPress={props.onRetry} />
              <Button label={t.captureChooseAnotherPhoto} variant="secondary" onPress={handlePickGallery} />
            </Row>
          </Col>
        </View>
      ) : (
        <View style={styles.targetFrame} pointerEvents="none">
          <AppText variant="smSemi" color={COLORS.surface} center style={styles.frameTitle}>
            {props.busy ? t.captureSavingLocally : frameHeading}
          </AppText>
          <AppText style={styles.srOnly}>{t.captureFrameHint}</AppText>
          {!props.busy ? (
            <AppText variant="xs" color="#cbd5e1" center style={styles.frameSubtitle}>
              {frameSubtitle}
            </AppText>
          ) : null}
        </View>
      )}

      {/* Bottom Shutter & Picker Bar */}
      <Row justify="space-around" align="center" style={[styles.controls, { paddingBottom: insets.bottom + SPACING.sm }]}>
        {/* Gallery Picker */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.captureChoosePhoto}
          accessibilityState={{ disabled: Boolean(props.busy) }}
          onPress={handlePickGallery}
          disabled={props.busy}
          style={[styles.sideButton, props.busy && styles.controlDisabled]}
        >
          <AppText style={styles.sideButtonText}>🖼️</AppText>
        </Pressable>

        {/* Shutter Trigger (76px outer with 60px orange gradient center FAB) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.captureTakePhoto}
          accessibilityState={{ disabled: !canCapture }}
          disabled={!canCapture}
          onPress={props.onCapture}
          style={[styles.shutterOuter, !canCapture && styles.controlDisabled]}
        >
          <LinearGradient
            colors={['#c2410c', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shutterInner}
          />
        </Pressable>

        {/* Camera Switch / Flip */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.captureFlipCamera}
          accessibilityState={{ disabled: Boolean(props.busy) }}
          onPress={handleFlipCamera}
          disabled={props.busy}
          style={[styles.sideButton, props.busy && styles.controlDisabled]}
        >
          <AppText style={styles.sideButtonText}>🔄</AppText>
        </Pressable>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c140e',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  top: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    zIndex: 10,
  },
  topButton: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  flashIconText: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
  },
  flashOff: {
    opacity: 0.45,
  },
  onDeviceBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onDeviceBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  viewfinder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0c140e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  targetFrame: {
    position: 'absolute',
    top: '16%',
    left: '8%',
    right: '8%',
    bottom: '24%',
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(74, 222, 128, 0.85)',
    borderRadius: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  frameTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 6,
  },
  frameSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    lineHeight: 17,
  },
  controls: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    zIndex: 10,
    marginBottom: 8,
  },
  sideButton: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonText: {
    fontSize: 20,
    textAlign: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#c2410c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
  },
  controlDisabled: {
    opacity: 0.4,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    zIndex: 20,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
});
