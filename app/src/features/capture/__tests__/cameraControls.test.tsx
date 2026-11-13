import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CaptureScreen, CaptureScreenProps } from '../CaptureScreen';
import { CameraCapture } from '../CameraCapture';
import { LanguageProvider, strings } from '../../../ui';
import * as ImagePicker from 'expo-image-picker';

// Mock expo-camera and expo-image-picker for CameraCapture container tests
const mockTakePictureAsync = jest.fn();
const mockRequestPermission = jest.fn();
let mockPermissionState: { granted: boolean; canAskAgain: boolean } | null = { granted: true, canAskAgain: true };

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const CameraView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: mockTakePictureAsync,
    }));
    return <View testID="mock-camera-view" {...props} />;
  });
  return {
    CameraView,
    useCameraPermissions: () => [mockPermissionState, mockRequestPermission],
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

function defaultProps(overrides?: Partial<CaptureScreenProps>): CaptureScreenProps {
  return {
    onClose: jest.fn(),
    onCapture: jest.fn(),
    onPickImage: jest.fn(),
    onFlip: jest.fn(),
    onToggleFlash: jest.fn(),
    canCapture: true,
    busy: false,
    error: null,
    onRetry: jest.fn(),
    ...overrides,
  };
}

describe('CaptureScreen camera controls', () => {
  it('renders viewfinder with top controls, dashed reticle, and shutter bar', async () => {
    const onClose = jest.fn();
    const onCapture = jest.fn();
    const onPickGallery = jest.fn();
    const onFlipCamera = jest.fn();
    const onToggleFlash = jest.fn();

    await render(
      <CaptureScreen
        onCapture={onCapture}
        onClose={onClose}
        onPickGallery={onPickGallery}
        activeCamera="back"
        onFlipCamera={onFlipCamera}
        flashMode="auto"
        onToggleFlash={onToggleFlash}
      />,
    );

    expect(screen.getByLabelText(/isara ang camera|close camera/i)).toBeTruthy();
    expect(screen.getByText(/On-Device Only|Lokal na Device Lamang/i)).toBeTruthy();
    expect(screen.getByText(/Center the fruit within the frame|Itapat ang prutas/i)).toBeTruthy();
    expect(screen.getByText(/Ensure natural lighting and steady focus on lesions/i)).toBeTruthy();
  });

  it('triggers onFlipCamera and onPickGallery when provided', async () => {
    const onFlipCamera = jest.fn();
    const onPickGallery = jest.fn();
    const props = defaultProps({ onFlipCamera, onPickGallery });
    await render(<CaptureScreen {...props} />);

    const flipBtn = screen.getByRole('button', { name: strings('EN').captureFlipCamera });
    await fireEvent.press(flipBtn);
    expect(onFlipCamera).toHaveBeenCalledTimes(1);

    const galleryBtn = screen.getByRole('button', { name: strings('EN').captureChoosePhoto });
    await fireEvent.press(galleryBtn);
    expect(onPickGallery).toHaveBeenCalledTimes(1);
  });

  it('disables the shutter and indicates not ready when canCapture is false', async () => {
    const props = defaultProps({ canCapture: false });
    await render(<CaptureScreen {...props} />);

    const shutter = screen.getByRole('button', { name: strings('EN').captureTakePhoto });
    expect(shutter.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(shutter);
    expect(props.onCapture).not.toHaveBeenCalled();
  });

  it('enables the shutter and triggers onCapture when canCapture is true', async () => {
    const props = defaultProps({ canCapture: true });
    await render(<CaptureScreen {...props} />);

    const shutter = screen.getByRole('button', { name: strings('EN').captureTakePhoto });
    expect(shutter.props.accessibilityState).toMatchObject({ disabled: false });

    await fireEvent.press(shutter);
    expect(props.onCapture).toHaveBeenCalledTimes(1);
  });

  it('triggers onFlip when the flip camera button is pressed', async () => {
    const props = defaultProps();
    await render(<CaptureScreen {...props} />);

    const flipBtn = screen.getByRole('button', { name: strings('EN').captureFlipCamera });
    await fireEvent.press(flipBtn);
    expect(props.onFlip).toHaveBeenCalledTimes(1);
  });

  it('triggers onPickImage when the gallery picker button is pressed', async () => {
    const props = defaultProps();
    await render(<CaptureScreen {...props} />);

    const galleryBtn = screen.getByRole('button', { name: strings('EN').captureChoosePhoto });
    await fireEvent.press(galleryBtn);
    expect(props.onPickImage).toHaveBeenCalledTimes(1);
  });

  it('disables all camera controls and displays saving message when busy is true', async () => {
    const props = defaultProps({ busy: true });
    await render(<CaptureScreen {...props} />);

    const shutter = screen.getByRole('button', { name: strings('EN').captureTakePhoto });
    const close = screen.getByRole('button', { name: strings('EN').captureCloseCamera });
    const gallery = screen.getByRole('button', { name: strings('EN').captureChoosePhoto });
    const flip = screen.getByRole('button', { name: strings('EN').captureFlipCamera });

    expect(shutter.props.accessibilityState).toMatchObject({ disabled: true });
    expect(close.props.accessibilityState).toMatchObject({ disabled: true });
    expect(gallery.props.accessibilityState).toMatchObject({ disabled: true });
    expect(flip.props.accessibilityState).toMatchObject({ disabled: true });

    expect(screen.getByText(strings('EN').captureSavingLocally)).toBeTruthy();
  });

  it('displays error overlay and handles retry when saving fails', async () => {
    const props = defaultProps({ error: 'Failed to write photo to disk.' });
    await render(<CaptureScreen {...props} />);

    const alertText = screen.getByRole('alert');
    expect(alertText.props.children).toBe('Failed to write photo to disk.');

    const retryBtn = screen.getByRole('button', { name: strings('EN').captureRetry });
    await fireEvent.press(retryBtn);
    expect(props.onRetry).toHaveBeenCalledTimes(1);

    const pickAnother = screen.getByRole('button', { name: strings('EN').captureChooseAnotherPhoto });
    await fireEvent.press(pickAnother);
    expect(props.onPickImage).toHaveBeenCalledTimes(1);
  });

  it('toggles flash mode when flash button is pressed', async () => {
    const props = defaultProps();
    await render(<CaptureScreen {...props} />);

    const flashBtn = screen.getByRole('button', { name: strings('EN').captureFlash });
    await fireEvent.press(flashBtn);
    expect(props.onToggleFlash).toHaveBeenCalledTimes(1);
  });

  it('renders localized controls and labels in Filipino', async () => {
    const props = defaultProps();
    await render(
      <LanguageProvider language="FIL">
        <CaptureScreen {...props} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('button', { name: strings('FIL').captureCloseCamera })).toBeTruthy();
    expect(screen.getByRole('button', { name: strings('FIL').captureTakePhoto })).toBeTruthy();
    expect(screen.getByRole('button', { name: strings('FIL').captureChoosePhoto })).toBeTruthy();
    expect(screen.getByRole('button', { name: strings('FIL').captureFlipCamera })).toBeTruthy();
    expect(screen.getByText(/Itapat ang prutas sa gitna ng frame/i)).toBeTruthy();
    expect(screen.getByText(/Siguraduhing maliwanag at kitang-kita ang balat o sugat/i)).toBeTruthy();
  });
});

describe('CameraCapture container with device interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows permission prompt when camera permission is not granted', async () => {
    mockPermissionState = { granted: false, canAskAgain: true };
    const onClose = jest.fn();
    const onCaptured = jest.fn();

    await render(<CameraCapture onClose={onClose} onCaptured={onCaptured} />);

    expect(screen.getByText(strings('EN').captureCameraAccessNeeded)).toBeTruthy();
    const allowBtn = screen.getByRole('button', { name: strings('EN').captureAllowCameraAccess });
    await fireEvent.press(allowBtn);
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('takes picture through camera ref and delivers uri to onCaptured', async () => {
    mockPermissionState = { granted: true, canAskAgain: true };
    mockTakePictureAsync.mockResolvedValueOnce({ uri: 'file:///photo-123.jpg' });

    const onClose = jest.fn();
    const onCaptured = jest.fn().mockResolvedValue(undefined);

    await render(<CameraCapture onClose={onClose} onCaptured={onCaptured} />);

    const shutter = screen.getByRole('button', { name: strings('EN').captureTakePhoto });
    await fireEvent.press(shutter);

    expect(mockTakePictureAsync).toHaveBeenCalledWith({ quality: 0.8 });
    expect(onCaptured).toHaveBeenCalledWith('file:///photo-123.jpg');
  });

  it('handles gallery picker selection and cancellation truthfully', async () => {
    mockPermissionState = { granted: true, canAskAgain: true };
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///gallery-456.jpg' }],
    });

    const onCaptured = jest.fn().mockResolvedValue(undefined);
    await render(<CameraCapture onClose={jest.fn()} onCaptured={onCaptured} />);

    const galleryBtn = screen.getByRole('button', { name: strings('EN').captureChoosePhoto });
    await fireEvent.press(galleryBtn);

    expect(onCaptured).toHaveBeenCalledWith('file:///gallery-456.jpg');

    // Test gallery cancellation
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    await fireEvent.press(galleryBtn);
    // Should not call onCaptured again
    expect(onCaptured).toHaveBeenCalledTimes(1);
  });

  it('handles capture save failure and allows retrying the same photo URI', async () => {
    mockPermissionState = { granted: true, canAskAgain: true };
    mockTakePictureAsync.mockResolvedValueOnce({ uri: 'file:///captured-fail.jpg' });

    const onCaptured = jest.fn()
      .mockRejectedValueOnce(new Error('SQLite disk full'))
      .mockResolvedValueOnce(undefined);

    await render(<CameraCapture onClose={jest.fn()} onCaptured={onCaptured} />);

    const shutter = screen.getByRole('button', { name: strings('EN').captureTakePhoto });
    await fireEvent.press(shutter);

    // Should render error overlay
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(strings('EN').captureSavingFailed)).toBeTruthy();

    // Press retry
    const retryBtn = screen.getByRole('button', { name: strings('EN').captureRetry });
    await fireEvent.press(retryBtn);

    // onCaptured called second time with the saved attempt URI
    expect(onCaptured).toHaveBeenCalledTimes(2);
    expect(onCaptured).toHaveBeenLastCalledWith('file:///captured-fail.jpg');
  });
});
