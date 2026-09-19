import React, { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import {
  AppText, Button, Col, COLORS, RADIUS, Section, SPACING, useT,
} from '../../ui';

export interface ResetPasswordScreenProps {
  busy: boolean;
  error: string | null;
  onSubmitNewPassword: (password: string) => Promise<{ ok: boolean; errorKey?: string }>;
  onCancel?: () => void;
  onDone?: () => void;
}

export function ResetPasswordScreen(props: ResetPasswordScreenProps) {
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async () => {
    if (props.busy || submitting) return;

    if (password.length < 6) {
      setLocalError(t.authErrorWeakPassword);
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(t.passwordMismatch);
      return;
    }

    setLocalError(null);
    setSubmitting(true);

    try {
      const outcome = await props.onSubmitNewPassword(password);
      if (outcome.ok) {
        setSucceeded(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <Section gap={SPACING.md}>
        <AppText variant="xl">{t.passwordResetSuccessTitle}</AppText>
        <AppText variant="sm" color={COLORS.textSecondary}>
          {t.passwordResetSuccessDetail}
        </AppText>
        <Button
          label={t.done}
          onPress={() => {
            if (props.onDone) props.onDone();
          }}
        />
      </Section>
    );
  }

  const isBusy = props.busy || submitting;
  const displayError = localError || props.error;

  return (
    <Section gap={SPACING.md}>
      <AppText variant="xl">{t.titleResetPassword}</AppText>

      <Col gap={SPACING.sm}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.newPasswordLabel}</AppText>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={text => {
            setPassword(text);
            if (localError) setLocalError(null);
          }}
          secureTextEntry
          accessibilityLabel={t.newPasswordLabel}
        />

        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.confirmPasswordLabel}</AppText>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={text => {
            setConfirmPassword(text);
            if (localError) setLocalError(null);
          }}
          secureTextEntry
          accessibilityLabel={t.confirmPasswordLabel}
        />
      </Col>

      {displayError ? (
        <AppText variant="sm" color={COLORS.error}>{displayError}</AppText>
      ) : null}

      <Button
        label={isBusy ? t.updatingPassword : t.setNewPassword}
        onPress={handleSubmit}
      />

      {props.onCancel ? (
        <Button
          variant="secondary"
          label={t.cancel}
          onPress={props.onCancel}
        />
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
  },
});