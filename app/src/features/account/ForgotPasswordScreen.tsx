import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  BtnForestFull,
  BtnSubtle,
  FrostedCard,
  GreenTopCell,
  useT,
} from '../../ui';

export interface ForgotPasswordScreenProps {
  busy: boolean;
  error: string | null;
  message: string | null;
  onSubmit: (email: string) => void;
  onBack: () => void;
}

export function ForgotPasswordScreen(props: ForgotPasswordScreenProps) {
  const t = useT();
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (props.busy) return;
    props.onSubmit(email.trim());
  };

  const isFil = t.logInTitle === 'Mag-log in';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Green Top Cell */}
      <GreenTopCell
        title={t.titleResetPassword}
        subtitle={isFil ? 'Humingi ng recovery link sa iyong email' : 'Request a secure password recovery link'}
        rightAction={(
          <BtnSubtle
            label={`✕ ${isFil ? 'Kanselahin' : 'Cancel'}`}
            textColor="#ffffff"
            onPress={props.onBack}
            accessibilityLabel={t.cancel}
            style={styles.cancelBtn}
          />
        )}
        style={styles.greenTop}
      />

      <View style={styles.body}>
        {/* Form Card */}
        <FrostedCard style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              {isFil ? 'Rehistradong Email' : 'Registered Email'}
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
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!props.busy}
            />
            <Text style={styles.formHelperText}>
              {isFil
                ? 'Kung may umiiral na account sa email na ito, makakatanggap ka ng recovery link.'
                : 'If an account exists for this address, you will receive recovery instructions.'}
            </Text>
          </View>

          {/* Status Message */}
          {props.message ? (
            <Text style={styles.messageText} accessibilityLiveRegion="polite">
              {props.message}
            </Text>
          ) : null}

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
            label={props.busy ? (isFil ? 'Ipinapadala ang recovery link…' : 'Sending reset link…') : (isFil ? 'Ipadala ang Recovery Link' : 'Send Reset Link')}
            accessibilityLabel={props.busy ? (isFil ? 'Ipinapadala ang recovery link…' : 'Sending reset link…') : (isFil ? 'Ipadala ang Recovery Link' : 'Send Reset Link')}
            onPress={handleSubmit}
            disabled={props.busy}
            style={{ marginTop: 14 }}
          />
        </FrostedCard>

        {/* Back Link */}
        <View style={styles.backContainer}>
          <BtnSubtle
            label={`← ${isFil ? 'Bumalik sa Log In' : 'Back to Log In'}`}
            textColor="#154d2e"
            onPress={props.onBack}
            accessibilityLabel={isFil ? 'Bumalik sa Log In' : 'Back to Log In'}
            disabled={props.busy}
            style={styles.backBtn}
          />
        </View>


      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
    overflow: 'hidden',
  },
  container: {
    paddingBottom: 32,
    backgroundColor: '#f7f9f5',
  },
  greenTop: {
    marginBottom: 12,
  },
  cancelBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  body: {
    paddingHorizontal: 16,
    gap: 12,
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
    lineHeight: 16,
  },
  messageText: {
    fontSize: 12,
    color: '#154d2e',
    fontWeight: '600',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 8,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  backBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
