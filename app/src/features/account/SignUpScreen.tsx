import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BtnOrangeFull,
  BtnSubtle,
  FrostedCard,
  GreenTopCell,
  useT,
} from '../../ui';
import { EmailConfirmationScreen } from './EmailConfirmationScreen';

export interface SignUpScreenProps {
  busy: boolean;
  error: string | null;
  confirmationPendingEmail?: string | null;
  noticeMessage?: string | null;
  onSignUp: (email: string, password: string) => void;
  onGoToSignIn: () => void;
  onResendConfirmation?: (email?: string) => void;
  onContinueOffline?: () => void;
  onCancel?: () => void;
}

export function SignUpScreen(props: SignUpScreenProps) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isFil = t.logInTitle === 'Mag-log in';

  if (props.confirmationPendingEmail) {
    return (
      <EmailConfirmationScreen
        email={props.confirmationPendingEmail}
        busy={props.busy}
        error={props.error}
        message={props.noticeMessage ?? null}
        onResend={() => props.onResendConfirmation?.(props.confirmationPendingEmail!)}
        onBackToSignIn={props.onGoToSignIn}
        onContinueOffline={() => props.onContinueOffline?.()}
      />
    );
  }

  const handleSubmit = () => {
    if (props.busy) return;

    if (password.length > 0 && password.length < 8) {
      setLocalError(t.authErrorWeakPassword);
      return;
    }

    if (confirmPassword.length > 0 && password !== confirmPassword) {
      setLocalError(t.passwordMismatch);
      return;
    }

    setLocalError(null);
    props.onSignUp(email.trim(), password);
  };

  const displayError = localError || props.error;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.body}>
        <GreenTopCell
          title={isFil ? 'Gumawa ng Account' : 'Create Account'}
          subtitle={isFil ? 'Opsyonal: Gamitin ang app nang walang rehistro kung nais' : 'Optional: Core diagnosis & guidance remain 100% offline'}
          rightAction={props.onCancel ? (
            <BtnSubtle
              label={`✕ ${isFil ? 'Kanselahin' : 'Cancel'}`}
              textColor="#ffffff"
              onPress={props.onCancel}
              accessibilityLabel={t.cancel}
              style={styles.cancelBtn}
            />
          ) : null}
        />

        <FrostedCard style={styles.formCard}>
          {/* Email Field */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              {isFil ? 'Email Address' : 'Email Address'}
            </Text>
            <TextInput
              style={styles.formInput}
              value={email}
              onChangeText={text => {
                setEmail(text);
                if (localError) setLocalError(null);
              }}
              placeholder="magsasaka@halimbawa.ph"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Email"
              returnKeyType="next"
              editable={!props.busy}
            />
            <Text style={styles.formHelperText}>
              {isFil ? 'Magpapadala ng confirmation link' : 'We will send a confirmation link'}
            </Text>
          </View>

          {/* Password Field */}
          <View style={[styles.formGroup, { marginTop: 14 }]}>
            <Text style={styles.formLabel}>
              {isFil ? 'Password' : 'Password'}
            </Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (localError) setLocalError(null);
                }}
                secureTextEntry={!passwordVisible}
                accessibilityLabel="Password"
                returnKeyType="next"
                editable={!props.busy}
              />
              <Pressable
                accessibilityLabel={passwordVisible ? 'Hide' : 'Show'}
                onPress={() => setPasswordVisible(v => !v)}
                style={styles.passwordToggleBtn}
                hitSlop={8}
              >
                <Text style={styles.passwordToggleText}>
                  {passwordVisible ? '🙈 Hide' : '👁️ Show'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.formHelperText}>
              {isFil ? 'Hindi bababa sa 8 karakter' : 'At least 8 characters'}
            </Text>
          </View>

          {/* Confirm Password Field */}
          <View style={[styles.formGroup, { marginTop: 14 }]}>
            <Text style={styles.formLabel}>
              {isFil ? 'Ulitin ang Password' : 'Confirm Password'}
            </Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  if (localError) setLocalError(null);
                }}
                secureTextEntry={!passwordVisible}
                accessibilityLabel="Confirm password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!props.busy}
              />
            </View>
          </View>

          {/* Privacy Disclosure Notice */}
          <View style={styles.privacyNoticeBox}>
            <Text style={styles.privacyNoticeText}>
              🔒 <Text style={styles.privacyNoticeBold}>{isFil ? 'Proteksyon sa Datos:' : 'Data Privacy:'}</Text>{' '}
              {isFil
                ? 'Lahat ng litrato ng pananim ay mananatili lamang sa iyong telepono at hindi ia-upload.'
                : 'All fruit capture photographs remain strictly on this device.'}
            </Text>
          </View>

          {/* Error Message */}
          {displayError ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {displayError}
            </Text>
          ) : null}

          {/* Submit Button */}
          <BtnOrangeFull
            label={props.busy ? (isFil ? 'Pumapasok…' : 'Signing in…') : (isFil ? 'Irehistro ang Account' : 'Create Account')}
            accessibilityLabel={props.busy ? t.signingIn : t.signUp}
            onPress={handleSubmit}
            disabled={props.busy}
            style={{ marginTop: 8 }}
          />
        </FrostedCard>

        {/* Alternative Navigation Paths */}
        <View style={styles.altLinks}>
          <BtnSubtle
            label={isFil ? 'May account na? Mag-log in' : 'Already have an account? Log In'}
            textColor="#154d2e"
            onPress={props.onGoToSignIn}
            accessibilityLabel={t.alreadyHaveAccount}
            disabled={props.busy}
            style={styles.linkBtn}
          />
          {props.onContinueOffline ? (
            <BtnSubtle
              label={isFil ? 'Magpatuloy nang Offline' : 'Continue Offline'}
              textColor="#64748b"
              onPress={props.onContinueOffline}
              accessibilityLabel={t.continueOffline}
              disabled={props.busy}
              style={styles.linkBtn}
            />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f2f6f3',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f2f6f3',
  },
  cancelBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  body: {
    paddingTop: 14,
    paddingHorizontal: 15,
    paddingBottom: 20,
    gap: 14,
  },
  formCard: {
    padding: 16,
  },
  formGroup: {
    width: '100%',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1c2820',
    marginBottom: 6,
  },
  formInput: {
    minHeight: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1c2820',
  },
  formHelperText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1c2820',
  },
  passwordToggleBtn: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  passwordToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#154d2e',
  },
  privacyNoticeBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  privacyNoticeText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },
  privacyNoticeBold: {
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    marginVertical: 6,
  },
  altLinks: {
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  linkBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
