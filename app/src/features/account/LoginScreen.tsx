import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BtnForestFull,
  BtnSubtle,
  FrostedCard,
  GreenTopCell,
  useT,
} from '../../ui';

export interface LoginScreenProps {
  busy: boolean;
  error: string | null;
  onSignIn: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onCreateAccount: () => void;
  onContinueOffline: () => void;
  onCancel?: () => void;
}

export function LoginScreen(props: LoginScreenProps) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSubmit = () => {
    if (props.busy) return;
    props.onSignIn(email.trim(), password);
  };

  const isFil = t.logInTitle === 'Mag-log in';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.body}>
        {/* Green Top Cell */}
        <GreenTopCell
          title={isFil ? 'Mag-log in' : 'Log In'}
          subtitle={isFil ? 'I-sync ang iyong metadata habang ang litrato ay nananatili sa device' : 'Sync observations metadata while photos remain on device'}
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

        {/* Frosted Form Card */}
        <FrostedCard style={styles.formCard}>
          {/* Email Field */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              {isFil ? 'Email Address' : 'Email Address'}
            </Text>
            <TextInput
              style={styles.formInput}
              value={email}
              onChangeText={setEmail}
              placeholder="magsasaka@halimbawa.ph"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel={t.emailLabel}
              returnKeyType="next"
              editable={!props.busy}
            />
            <Text style={styles.formHelperText}>
              {isFil ? 'Ginamit noong pagpaparehistro' : 'Used during registration'}
            </Text>
          </View>

          {/* Password Field */}
          <View style={[styles.formGroup, { marginTop: 14 }]}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.formLabel}>
                {isFil ? 'Password' : 'Password'}
              </Text>
              <BtnSubtle
                label={isFil ? 'Nakalimutan?' : 'Forgot password?'}
                textColor="#ea580c"
                onPress={props.onForgotPassword}
                disabled={props.busy}
                accessibilityLabel={t.forgotPassword}
                style={styles.forgotBtn}
                textStyle={styles.forgotText}
              />
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                accessibilityLabel={t.passwordLabel}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!props.busy}
              />
              <Pressable
                accessibilityRole="button"
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
          </View>

          {/* Error Message */}
          {props.error ? (
            <Text
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {props.error}
            </Text>
          ) : null}

          {/* Submit Button */}
          <BtnForestFull
            label={props.busy ? (isFil ? 'Pumapasok…' : 'Signing in…') : (isFil ? 'Mag-log in' : 'Log In')}
            accessibilityLabel={props.busy ? t.signingIn : 'Sign in'}
            onPress={handleSubmit}
            disabled={props.busy}
            style={{ marginTop: 14 }}
          />
        </FrostedCard>

        {/* Alternative Navigation Paths */}
        <View style={styles.altLinks}>
          <BtnSubtle
            label={isFil ? 'Wala pang account? Gumawa rito' : 'Don’t have an account? Create one'}
            textColor="#154d2e"
            onPress={props.onCreateAccount}
            accessibilityLabel={isFil ? 'Wala pang account? Gumawa rito' : 'Don’t have an account? Create one'}
            disabled={props.busy}
            style={styles.linkBtn}
          />
          <BtnSubtle
            label={`🔒 ${isFil ? 'Magpatuloy nang Offline (Walang Account)' : 'Continue Offline (No Account)'}`}
            textColor="#64748b"
            onPress={props.onContinueOffline}
            accessibilityLabel={t.continueOfflineNoAccount ?? (isFil ? 'Magpatuloy nang Offline (Walang Account)' : 'Continue Offline (No Account)')}
            disabled={props.busy}
            style={styles.linkBtn}
          />
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotBtn: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 32,
  },
  forgotText: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '700',
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
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 10,
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
