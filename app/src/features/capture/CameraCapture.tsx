import React, { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Button, Col, COLORS, Icon, SPACING, useT } from '../../ui';
import { CaptureScreen } from './CaptureScreen';

export interface CameraCaptureProps {
  onClose: () => void;
  /** Receives the local file URI of the photo the user took or chose. */
  onCaptured: (uri: string) => void;
  onError: (message: string) => void;
}

/**
 * Owns the camera. The screen next door stays presentational so it can be
 * rendered in tests without a device; everything that needs real hardware —
 * permissions, the preview, the shutter — lives here.
 */
export function CameraCapture({ onClose, onCaptured, onError }: CameraCaptureProps) {
  const t = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);
  const camera = useRef<CameraView | null>(null);

  const granted = permission?.granted === true;

  const capture = useCallback(async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) onCaptured(photo.uri);
      else onError('The camera returned no image.');
    } catch {
      onError('The photo could not be taken.');
    } finally {
      setBusy(false);
    }
  }, [busy, onCaptured, onError]);

  const pickImage = useCallback(async () => {
    try {
      const allowed = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!allowed.granted) {
        onError('Photo access is needed to choose an existing image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) onCaptured(result.assets[0].uri);
    } catch {
      onError('The photo library could not be opened.');
    }
  }, [onCaptured, onError]);

  const flip = useCallback(() => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }, []);

  return (
    <CaptureScreen
      onClose={onClose}
      onCapture={capture}
      onPickImage={pickImage}
      onFlip={flip}
      canCapture={granted}
      busy={busy}
      preview={
        granted ? (
          <CameraView ref={camera} facing={facing} style={StyleSheet.absoluteFill} />
        ) : (
          <PermissionPrompt
            // `permission` is null until the first check resolves.
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
  if (!asked) {
    return (
      <View style={styles.prompt}>
        <AppText variant="sm" color={COLORS.surface} center>
          Starting the camera…
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.prompt}>
      <Col gap={SPACING.md} align="center">
        <Icon name="camera" size={40} color={COLORS.surface} />
        <AppText variant="mdSemi" color={COLORS.surface} center>
          Camera access is needed to scan a fruit
        </AppText>
        <AppText variant="xs" color="rgba(255,255,255,0.7)" center>
          {photoStaysHere}
        </AppText>
        {canAskAgain ? (
          <Button label="Allow camera access" variant="accent" onPress={onRequest} />
        ) : (
          <Button
            label="Open settings"
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
    backgroundColor: '#131715',
  },
});
