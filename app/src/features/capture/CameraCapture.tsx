import React, { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Button, Col, COLORS, Icon, SPACING, useT } from '../../ui';
import { CaptureScreen } from './CaptureScreen';

export interface CameraCaptureProps {
  onClose: () => void;
  /** Receives the local file URI of the photo the user took or chose. */
  onCaptured: (uri: string) => void | Promise<void>;
}

/**
 * Owns the camera hardware, permissions, photo capture, and gallery selection.
 * The presentational screen handles chrome and controls.
 */
type PhotoAttempt = { uri: string } | { error: string } | null;

export function CameraCapture({ onClose, onCaptured }: CameraCaptureProps) {
  const t = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camera = useRef<CameraView | null>(null);
  const inFlight = useRef(false);
  const retryPhotoUri = useRef<string | null>(null);

  const granted = permission?.granted === true;

  const runPhotoAttempt = useCallback(async (operation: () => Promise<PhotoAttempt>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    retryPhotoUri.current = null;
    setBusy(true);
    setError(null);
    try {
      const attempt = await operation();
      if (attempt === null) return;
      if ('error' in attempt) {
        setError(attempt.error);
        return;
      }
      retryPhotoUri.current = attempt.uri;
      await onCaptured(attempt.uri);
      retryPhotoUri.current = null;
    } catch {
      // The repository already cleaned up a partially owned copy. Never show
      // a raw filesystem or database error, and leave the last selected URI
      // available for an explicit retry.
      setError(t.captureSavingFailed);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [onCaptured, t.captureSavingFailed]);

  const capture = useCallback(async () => {
    if (!camera.current || inFlight.current) return;
    await runPhotoAttempt(async () => {
      try {
        const photo = await camera.current?.takePictureAsync({ quality: 0.8 });
        return photo?.uri ? { uri: photo.uri } : { error: t.captureNoImage };
      } catch {
        return { error: t.capturePhotoCaptureFailed };
      }
    });
  }, [runPhotoAttempt, t.captureNoImage, t.capturePhotoCaptureFailed]);

  const pickImage = useCallback(async () => {
    await runPhotoAttempt(async () => {
      try {
        const allowed = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!allowed.granted) return { error: t.capturePhotoAccessDenied };
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        return result.canceled || !result.assets?.[0]?.uri
          ? null
          : { uri: result.assets[0].uri };
      } catch {
        return { error: t.captureLibraryUnavailable };
      }
    });
  }, [runPhotoAttempt, t.captureLibraryUnavailable, t.capturePhotoAccessDenied]);

  const retry = useCallback(() => {
    const uri = retryPhotoUri.current;
    if (uri) {
      void runPhotoAttempt(async () => ({ uri }));
    } else {
      setError(null);
    }
  }, [runPhotoAttempt]);

  const flip = useCallback(() => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }, []);

  const toggleFlash = useCallback(() => {
    setFlash(current => {
      if (current === 'auto') return 'on';
      if (current === 'on') return 'off';
      return 'auto';
    });
  }, []);

  return (
    <CaptureScreen
      onClose={onClose}
      onCapture={capture}
      onPickImage={pickImage}
      onPickGallery={pickImage}
      onFlip={flip}
      onFlipCamera={flip}
      activeCamera={facing}
      onToggleFlash={toggleFlash}
      flashMode={flash}
      canCapture={granted}
      busy={busy}
      error={error}
      onRetry={retry}
      preview={
        granted ? (
          <CameraView ref={camera} facing={facing} flash={flash} style={StyleSheet.absoluteFill} />
        ) : (
          <PermissionPrompt
            asked={permission != null}
            canAskAgain={permission?.canAskAgain !== false}
            onRequest={requestPermission}
            photoStaysHere={t.photoStaysHere}
          />
        )
      }
    />
  );
}

function PermissionPrompt({
  asked,
  canAskAgain,
  onRequest,
  photoStaysHere,
}: {
  asked: boolean;
  canAskAgain: boolean;
  onRequest: () => void;
  photoStaysHere: string;
}) {
  const t = useT();

  if (!asked) {
    return (
      <View style={styles.prompt}>
        <AppText variant="sm" color={COLORS.surface} center>
          {t.captureStartingCamera}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.prompt}>
      <Col gap={SPACING.md} align="center">
        <Icon name="camera" size={40} color={COLORS.surface} />
        <AppText variant="mdSemi" color={COLORS.surface} center>
          {t.captureCameraAccessNeeded}
        </AppText>
        <AppText variant="xs" color="rgba(255,255,255,0.7)" center>
          {photoStaysHere}
        </AppText>
        {canAskAgain ? (
          <Button label={t.captureAllowCameraAccess} variant="accent" onPress={onRequest} />
        ) : (
          <Button
            label={t.openSettings}
            variant="accent"
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        )}
      </Col>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#0c140e',
  },
});
