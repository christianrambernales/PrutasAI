import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { render, screen } from '@testing-library/react-native';

import { LoginScreen } from '../LoginScreen';
import { SignUpScreen } from '../SignUpScreen';
import { EmailConfirmationScreen } from '../EmailConfirmationScreen';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';
import { AccountScreen } from '../AccountScreen';
import { findPressable, press, textInputs, textOf, typeInto } from '../../../testing/interaction';
import { LanguageProvider } from '../../../ui';

function testRender(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

describe('LoginScreen', () => {
  test('typing email and password then submitting calls onSignIn with entered credentials', () => {
    const onSignIn = jest.fn();
    const tree = testRender(
      <LoginScreen
        busy={false}
        error={null}
        onSignIn={onSignIn}
        onForgotPassword={jest.fn()}
        onCreateAccount={jest.fn()}
        onContinueOffline={jest.fn()}
      />,
    );

    typeInto(tree, 'magsasaka', 'grower@example.test');
    const pwdField = textInputs(tree).find(n => n.props.accessibilityLabel === 'Password');
    expect(pwdField).toBeTruthy();
    act(() => { pwdField!.props.onChangeText('secret123'); });

    press(tree, 'Log In');
    expect(onSignIn).toHaveBeenCalledWith('grower@example.test', 'secret123');
  });

  test('when busy is true, text inputs are disabled and submitting is blocked', () => {
    const onSignIn = jest.fn();
    const tree = testRender(
      <LoginScreen
        busy={true}
        error={null}
        onSignIn={onSignIn}
        onForgotPassword={jest.fn()}
        onCreateAccount={jest.fn()}
        onContinueOffline={jest.fn()}
      />,
    );

    expect(textInputs(tree).every(n => n.props.editable === false)).toBe(true);
    press(tree, 'Signing in…');
    expect(onSignIn).not.toHaveBeenCalled();
  });

  test('navigation action links call their respective callbacks', () => {
    const onForgotPassword = jest.fn();
    const onCreateAccount = jest.fn();
    const onContinueOffline = jest.fn();
    const onCancel = jest.fn();
    const tree = testRender(
      <LoginScreen
        busy={false}
        error={null}
        onSignIn={jest.fn()}
        onForgotPassword={onForgotPassword}
        onCreateAccount={onCreateAccount}
        onContinueOffline={onContinueOffline}
        onCancel={onCancel}
      />,
    );

    press(tree, 'Forgot password?');
    expect(onForgotPassword).toHaveBeenCalledTimes(1);

    press(tree, 'Don’t have an account? Create one');
    expect(onCreateAccount).toHaveBeenCalledTimes(1);

    press(tree, 'Continue Offline (No Account)');
    expect(onContinueOffline).toHaveBeenCalledTimes(1);

    press(tree, 'Cancel');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('displays error banner with assertive live region and alert role', () => {
    const tree = testRender(
      <LoginScreen
        busy={false}
        error="Invalid username or password"
        onSignIn={jest.fn()}
        onForgotPassword={jest.fn()}
        onCreateAccount={jest.fn()}
        onContinueOffline={jest.fn()}
      />,
    );

    const alert = tree.root.findAll(n => n.props.accessibilityRole === 'alert');
    expect(alert.some(n => n.props.accessibilityLiveRegion === 'assertive')).toBe(true);
    expect(textOf(tree.root)).toContain('Invalid username or password');
  });

  test('toggles password visibility between show and hide', () => {
    const tree = testRender(
      <LoginScreen
        busy={false}
        error={null}
        onSignIn={jest.fn()}
        onForgotPassword={jest.fn()}
        onCreateAccount={jest.fn()}
        onContinueOffline={jest.fn()}
      />,
    );

    const pwdField = textInputs(tree).find(n => n.props.accessibilityLabel === 'Password');
    expect(pwdField!.props.secureTextEntry).toBe(true);

    press(tree, '👁️ Show');
    expect(textInputs(tree).find(n => n.props.accessibilityLabel === 'Password')!.props.secureTextEntry).toBe(false);

    press(tree, '🙈 Hide');
    expect(textInputs(tree).find(n => n.props.accessibilityLabel === 'Password')!.props.secureTextEntry).toBe(true);
  });
});

describe('EmailConfirmationScreen', () => {
  test('renders pending email badge and wires resend and offline actions', () => {
    const onResend = jest.fn();
    const onContinueOffline = jest.fn();
    const onBackToSignIn = jest.fn();
    const tree = testRender(
      <EmailConfirmationScreen
        email="grower@example.test"
        busy={false}
        error={null}
        message={null}
        onResend={onResend}
        onContinueOffline={onContinueOffline}
        onBackToSignIn={onBackToSignIn}
      />,
    );

    expect(textOf(tree.root)).toContain('grower@example.test');
    expect(textOf(tree.root)).toContain('Check your email');

    press(tree, 'Resend Email');
    expect(onResend).toHaveBeenCalledTimes(1);

    press(tree, 'Continue Using Offline');
    expect(onContinueOffline).toHaveBeenCalledTimes(1);

    press(tree, 'Back to Log In');
    expect(onBackToSignIn).toHaveBeenCalledTimes(1);
  });

  test('disables resend when busy and renders status message banner', () => {
    const onResend = jest.fn();
    const tree = testRender(
      <EmailConfirmationScreen
        email="grower@example.test"
        busy={true}
        error={null}
        message="A new confirmation email has been sent."
        onResend={onResend}
        onContinueOffline={jest.fn()}
      />,
    );

    expect(textOf(tree.root)).toContain('A new confirmation email has been sent.');
    press(tree, 'Resending…');
    expect(onResend).not.toHaveBeenCalled();
  });

  test('displays error banner when error prop is provided', () => {
    const tree = testRender(
      <EmailConfirmationScreen
        email="grower@example.test"
        busy={false}
        error="Network timeout while resending"
        message={null}
        onResend={jest.fn()}
        onContinueOffline={jest.fn()}
      />,
    );

    const alert = tree.root.findAll(n => n.props.accessibilityRole === 'alert');
    expect(alert.length).toBeGreaterThan(0);
    expect(textOf(tree.root)).toContain('Network timeout while resending');
  });
});

describe('ForgotPasswordScreen', () => {
  test('typing email and submitting calls onSubmit', () => {
    const onSubmit = jest.fn();
    const onBack = jest.fn();
    const tree = testRender(
      <ForgotPasswordScreen
        busy={false}
        error={null}
        message={null}
        onSubmit={onSubmit}
        onBack={onBack}
      />,
    );

    typeInto(tree, 'magsasaka', 'grower@example.test');
    press(tree, 'Send Reset Link');
    expect(onSubmit).toHaveBeenCalledWith('grower@example.test');

    press(tree, 'Back to Log In');
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('disables submit when busy', () => {
    const onSubmit = jest.fn();
    const tree = testRender(
      <ForgotPasswordScreen
        busy={true}
        error={null}
        message={null}
        onSubmit={onSubmit}
        onBack={jest.fn()}
      />,
    );

    expect(textInputs(tree)[0].props.editable).toBe(false);
    press(tree, 'Sending reset link…');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('displays status message and error banner', () => {
    const tree = testRender(
      <ForgotPasswordScreen
        busy={false}
        error="Rate limit exceeded"
        message="If an account exists, a link was sent."
        onSubmit={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(textOf(tree.root)).toContain('Rate limit exceeded');
    expect(textOf(tree.root)).toContain('If an account exists, a link was sent.');
    const alert = tree.root.findAll(n => n.props.accessibilityRole === 'alert');
    expect(alert.length).toBeGreaterThan(0);
  });
});

describe('AccountScreen', () => {
  test('guest mode renders Guest Farmer, offline indicators, and auth entry actions', () => {
    const onOpenLogin = jest.fn();
    const onCreateAccount = jest.fn();
    const onSetSyncMode = jest.fn();
    const tree = testRender(
      <AccountScreen
        email={null}
        busy={false}
        error={null}
        resetMessage={null}
        onOpenLogin={onOpenLogin}
        onCreateAccount={onCreateAccount}
        onSignOut={jest.fn()}
        syncMode="offline"
        onSetSyncMode={onSetSyncMode}
      />,
    );

    expect(textOf(tree.root)).toContain('Guest Farmer');
    expect(textOf(tree.root)).toContain('Operating offline on this device');
    expect(textOf(tree.root)).toContain('Photographs remain strictly on device');

    press(tree, 'Log In');
    expect(onOpenLogin).toHaveBeenCalledTimes(1);

    press(tree, 'Create Account');
    expect(onCreateAccount).toHaveBeenCalledTimes(1);

    press(tree, 'Sync Metadata');
    expect(onSetSyncMode).toHaveBeenCalledWith('account');
  });

  test('signed-in mode renders user email, status, sign out, and sync mode actions', () => {
    const onSignOut = jest.fn();
    const onSetSyncMode = jest.fn();
    const tree = testRender(
      <AccountScreen
        email="farmer@prutas.ph"
        busy={false}
        error={null}
        resetMessage={null}
        onSignOut={onSignOut}
        syncMode="account"
        onSetSyncMode={onSetSyncMode}
      />,
    );

    const text = textOf(tree.root);
    expect(text).toContain('farmer@prutas.ph');
    expect(text).toContain('Logged In (Cloud Ready)');
    expect(text).not.toContain('Sync now');
    expect(text).not.toContain('Remove this device copy');

    press(tree, 'Sign Out (Photos remain on device)');
    expect(onSignOut).toHaveBeenCalledTimes(1);

    press(tree, 'Local Offline Only');
    expect(onSetSyncMode).toHaveBeenCalledWith('offline');
  });

  test('modeChangeBusy disables sync mode controls', () => {
    const tree = testRender(
      <AccountScreen
        email={null}
        busy={false}
        error={null}
        resetMessage={null}
        onSignOut={jest.fn()}
        syncMode="offline"
        modeChangeBusy={true}
        onSetSyncMode={jest.fn()}
      />,
    );

    const offlineBtn = findPressable(tree, 'Local Offline Only');
    const syncBtn = findPressable(tree, 'Sync Metadata');
    expect(offlineBtn.props.disabled).toBe(true);
    expect(offlineBtn.props.accessibilityState?.disabled).toBe(true);
    expect(syncBtn.props.disabled).toBe(true);
    expect(syncBtn.props.accessibilityState?.disabled).toBe(true);
  });

  test('cloud synchronization card renders only the two prototype mode buttons', () => {
    const onSetSyncMode = jest.fn();
    const tree = testRender(
      <AccountScreen
        email="farmer@prutas.ph"
        busy={false}
        error={null}
        resetMessage={null}
        onSignOut={jest.fn()}
        syncMode="offline"
        onSetSyncMode={onSetSyncMode}
      />,
    );

    const text = textOf(tree.root);
    expect(text).toContain('Local Offline Only');
    expect(text).toContain('Sync Metadata');
    expect(text).not.toContain('Keep this device data private');
    expect(text).not.toContain('Last successful sync');

    press(tree, 'Sync Metadata');
    expect(onSetSyncMode).toHaveBeenCalledWith('account');
  });

  test('integrated settings rows call their 4 prototype navigation and action handlers', () => {
    const onChangeLanguage = jest.fn();
    const onChangeLocation = jest.fn();
    const onOpenModels = jest.fn();
    const onOpenTrash = jest.fn();
    const tree = testRender(
      <AccountScreen
        email={null}
        busy={false}
        error={null}
        resetMessage={null}
        onSignOut={jest.fn()}
        language="EN"
        onChangeLanguage={onChangeLanguage}
        savedLocationLabel="Davao City"
        onChangeLocation={onChangeLocation}
        onOpenModels={onOpenModels}
        trashedCount={3}
        onOpenTrash={onOpenTrash}
      />,
    );

    const text = textOf(tree.root);
    expect(text).not.toContain('Scan history');
    expect(text).not.toContain('Refresh normals');
    expect(text).not.toContain('Forget my location');

    press(tree, 'Language, English');
    expect(onChangeLanguage).toHaveBeenCalledWith('FIL');

    press(tree, 'Crop Location, Davao City');
    expect(onChangeLocation).toHaveBeenCalledTimes(1);

    press(tree, 'AI Model Registry, Pipeline capability check');
    expect(onOpenModels).toHaveBeenCalledTimes(1);

    press(tree, 'Trash (15-Day Retention), 3 trashed conversations');
    expect(onOpenTrash).toHaveBeenCalledTimes(1);
  });

  test('confirmationPendingEmail delegates to EmailConfirmationScreen and hides signed-in identity', () => {
    const onResend = jest.fn();
    const onContinueOffline = jest.fn();
    const onOpenLogin = jest.fn();
    const tree = testRender(
      <AccountScreen
        email="farmer@prutas.ph"
        confirmationPendingEmail="pending@prutas.ph"
        busy={false}
        error={null}
        resetMessage={null}
        onSignOut={jest.fn()}
        onResendConfirmation={onResend}
        onContinueOffline={onContinueOffline}
        onOpenLogin={onOpenLogin}
      />,
    );

    expect(textOf(tree.root)).toContain('pending@prutas.ph');
    expect(textOf(tree.root)).toContain('Check your email');
    expect(textOf(tree.root)).not.toContain('Logged In (Cloud Ready)');

    press(tree, 'Resend Email');
    expect(onResend).toHaveBeenCalledWith('pending@prutas.ph');

    press(tree, 'Continue Using Offline');
    expect(onContinueOffline).toHaveBeenCalledTimes(1);

    press(tree, 'Back to Log In');
    expect(onOpenLogin).toHaveBeenCalledTimes(1);
  });

  test('renders in Filipino when wrapped in LanguageProvider', () => {
    const tree = testRender(
      <LanguageProvider language="FIL">
        <AccountScreen
          email={null}
          busy={false}
          error={null}
          resetMessage={null}
          onSignOut={jest.fn()}
          syncMode="offline"
        />
      </LanguageProvider>,
    );

    expect(textOf(tree.root)).toContain('Bisitang Magsasaka (Guest)');
    expect(textOf(tree.root)).toContain('Lokal na Offline Lamang');
    expect(textOf(tree.root)).toContain('I-sync ang Metadata');
  });
});

describe('Screen 12-16 Prototype 1:1 Alignment', () => {
  it('renders AccountScreen in guest mode matching prototype', async () => {
    await render(
      <AccountScreen
        isLoggedIn={false}
        userEmail={null}
        currentLanguage="EN"
        currentLocation="Davao City"
        trashedCount={1}
        onLogin={jest.fn()}
        onCreateAccount={jest.fn()}
        onToggleLanguage={jest.fn()}
        onOpenLocation={jest.fn()}
        onOpenModelStatus={jest.fn()}
        onOpenTrash={jest.fn()}
      />,
    );
    expect(screen.getByText(/Account & Settings/i)).toBeTruthy();
    expect(screen.getByText(/Guest Farmer/i)).toBeTruthy();
    expect(screen.getByText(/Log In/i)).toBeTruthy();
    expect(screen.getByText(/Create Account/i)).toBeTruthy();
    expect(screen.getByText(/Cloud Synchronization \(Optional\)/i)).toBeTruthy();
    expect(screen.getByText(/Trash \(15-Day Retention\)/i)).toBeTruthy();
  });

  it('renders AccountScreen in authenticated mode matching prototype', async () => {
    await render(
      <AccountScreen
        isLoggedIn={true}
        userEmail="juan@magsasaka.ph"
        currentLanguage="EN"
        currentLocation="Davao City"
        trashedCount={0}
        onSignOut={jest.fn()}
      />,
    );
    expect(screen.getByText('juan@magsasaka.ph')).toBeTruthy();
    expect(screen.getByText(/Logged In \(Cloud Ready\)/i)).toBeTruthy();
    expect(screen.getByText(/Sign Out \(Photos remain on device\)/i)).toBeTruthy();
  });

  it('renders LoginScreen matching login.html prototype', async () => {
    await render(
      <LoginScreen
        busy={false}
        error={null}
        onSignIn={jest.fn()}
        onForgotPassword={jest.fn()}
        onCreateAccount={jest.fn()}
        onContinueOffline={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getAllByText(/Log In/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Sync observations metadata while photos remain on device/i)).toBeTruthy();
    expect(screen.getByText(/Email Address/i)).toBeTruthy();
    expect(screen.getByText(/Used during registration/i)).toBeTruthy();
    expect(screen.getByText(/Forgot password\?/i)).toBeTruthy();
    expect(screen.getByText(/Don’t have an account\? Create one/i)).toBeTruthy();
    expect(screen.getByText(/Continue Offline \(No Account\)/i)).toBeTruthy();
  });

  it('renders SignUpScreen matching createAccount.html prototype', async () => {
    await render(
      <SignUpScreen
        busy={false}
        error={null}
        onSignUp={jest.fn()}
        onGoToSignIn={jest.fn()}
        onContinueOffline={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getAllByText(/Create Account/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Optional: Core diagnosis & guidance remain 100% offline/i)).toBeTruthy();
    expect(screen.getByText(/Email Address/i)).toBeTruthy();
    expect(screen.getByText(/We will send a confirmation link/i)).toBeTruthy();
    expect(screen.getByText(/At least 8 characters/i)).toBeTruthy();
    expect(screen.getByText(/Confirm Password/i)).toBeTruthy();
    expect(screen.getByText(/Data Privacy:/i)).toBeTruthy();
    expect(screen.getByText(/All fruit capture photographs remain strictly on this device/i)).toBeTruthy();
    expect(screen.getByText(/Already have an account\? Log In/i)).toBeTruthy();
  });

  it('renders EmailConfirmationScreen matching emailConfirm.html prototype', async () => {
    await render(
      <EmailConfirmationScreen
        email="juan@magsasaka.ph"
        busy={false}
        error={null}
        message={null}
        onResend={jest.fn()}
        onContinueOffline={jest.fn()}
        onBackToSignIn={jest.fn()}
      />,
    );
    expect(screen.getByText(/Check your email/i)).toBeTruthy();
    expect(screen.getByText(/A verification link has been sent/i)).toBeTruthy();
    expect(screen.getByText(/We sent a confirmation link to:/i)).toBeTruthy();
    expect(screen.getByText('juan@magsasaka.ph')).toBeTruthy();
    expect(screen.getByText(/Resend Email/i)).toBeTruthy();
    expect(screen.getByText(/Back to Log In/i)).toBeTruthy();
    expect(screen.getAllByText(/Continue Using Offline/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders ForgotPasswordScreen matching forgotPassword.html prototype', async () => {
    await render(
      <ForgotPasswordScreen
        busy={false}
        error={null}
        message={null}
        onSubmit={jest.fn()}
        onBack={jest.fn()}
      />,
    );
    expect(screen.getByText(/Reset Password/i)).toBeTruthy();
    expect(screen.getByText(/Request a secure password recovery link/i)).toBeTruthy();
    expect(screen.getByText(/Registered Email/i)).toBeTruthy();
    expect(screen.getByText(/If an account exists for this address, you will receive recovery instructions/i)).toBeTruthy();
    expect(screen.getByText(/Send Reset Link/i)).toBeTruthy();
    expect(screen.getByText(/Back to Log In/i)).toBeTruthy();
  });
});
