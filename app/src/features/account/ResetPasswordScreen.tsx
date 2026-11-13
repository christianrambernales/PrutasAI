import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AppText, BtnForestFull, BtnOutline, BtnSubtle, COLORS, FrostedCard, GreenTopCell, RADIUS, SPACING, useT,
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <GreenTopCell
          centered
          headerIcon={<Text style={{ fontSize: 36 }}>✅</Text>}
          title={t.passwordResetSuccessTitle}
        />

        <FrostedCard style={[styles.formCard, { alignItems: 'center' }]}>
          <AppText
            variant="sm"
            color={COLORS.textSecondary}
            center
            accessibilityLiveRegion="polite"
          >
            {t.passwordResetSuccessDetail}
          </AppText>
        </FrostedCard>

        <BtnForestFull
          label={t.done}
          onPress={() => {
            if (props.onDone) props.onDone();
          }}
        />
      </ScrollView>
    );
  }

  const isBusy = props.busy || submitting;
  const displayError = localError || props.error;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Green Top Cell */}
      <GreenTopCell
        title={t.titleResetPassword}
        subtitle={t.forgotPasswordSubtitle}
        rightAction={props.onCancel ? (
          <BtnSubtle
            label={`✕ ${t.cancel}`}
            textColor="#ffffff"
            onPress={props.onCancel}
            accessibilityLabel={t.cancel}
            style={styles.cancelBtn}
          />
        ) : undefined}
      />

      <FrostedCard style={styles.formCard}>
        <View style={styles.formContent}>
          {/* New Password */}
          <View style={styles.fieldGroup}>
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
              returnKeyType="next"
              editable={!isBusy}
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
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
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!isBusy}
            />
          </View>

          {/* Error Message */}
          {displayError ? (
            <AppText
              variant="sm"
              color={COLORS.error}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {displayError}
            </AppText>
          ) : null}

          {/* Submit Button */}
          <BtnForestFull
            label={isBusy ? t.updatingPassword : t.setNewPassword}
            onPress={handleSubmit}
            disabled={isBusy}
          />

          {props.onCancel ? (
            <BtnOutline
              label={t.cancel}
              onPress={props.onCancel}
              disabled={isBusy}
            />
          ) : null}
        </View>
      </FrostedCard>
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
    paddingTop: 14,
    paddingHorizontal: 15,
    paddingBottom: 20,
    gap: 14,
  },
  cancelBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  formCard: {
    padding: 16,
  },
  formContent: {
    gap: SPACING.md,
  },
  fieldGroup: {
    gap: SPACING.xs,
  },
  input: {
    minHeight: 48,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
  },
});
