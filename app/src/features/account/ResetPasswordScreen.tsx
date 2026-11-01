import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  AppText, Button, Card, Col, COLORS, RADIUS, Row, Section, SPACING, useT,
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.greenTopCell}>
          <AppText variant="title" center style={styles.iconEmoji}>
            ✅
          </AppText>
          <AppText variant="xl" color={COLORS.surface} center accessibilityRole="header">
            {t.passwordResetSuccessTitle}
          </AppText>
        </View>

        <Section gap={SPACING.md}>
          <Card style={styles.formCard}>
            <Col gap={SPACING.sm} align="center">
              <AppText
                variant="sm"
                color={COLORS.textSecondary}
                center
                accessibilityLiveRegion="polite"
              >
                {t.passwordResetSuccessDetail}
              </AppText>
            </Col>
          </Card>

          <Button
            variant="primary"
            label={t.done}
            onPress={() => {
              if (props.onDone) props.onDone();
            }}
          />
        </Section>
      </ScrollView>
    );
  }

  const isBusy = props.busy || submitting;
  const displayError = localError || props.error;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Green Top Cell */}
      <View style={styles.greenTopCell}>
        <Row justify="space-between" align="center">
          <AppText variant="xl" color={COLORS.surface} accessibilityRole="header">
            {t.titleResetPassword}
          </AppText>
          {props.onCancel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.cancel}
              onPress={props.onCancel}
              hitSlop={8}
              style={styles.cancelBtn}
            >
              <AppText variant="smSemi" color={COLORS.surface}>
                ✕ {t.cancel}
              </AppText>
            </Pressable>
          ) : null}
        </Row>
        <AppText variant="xs" color="rgba(255,255,255,0.85)" style={{ marginTop: SPACING.xs }}>
          {t.forgotPasswordSubtitle}
        </AppText>
      </View>

      <Section gap={SPACING.md}>
        <Card style={styles.formCard}>
          <Col gap={SPACING.md}>
            {/* New Password */}
            <Col gap={SPACING.xs}>
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
            </Col>

            {/* Confirm Password */}
            <Col gap={SPACING.xs}>
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
            </Col>

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
            <Button
              variant="primary"
              label={isBusy ? t.updatingPassword : t.setNewPassword}
              onPress={handleSubmit}
              disabled={isBusy}
            />

            {props.onCancel ? (
              <Button
                variant="secondary"
                label={t.cancel}
                onPress={props.onCancel}
                disabled={isBusy}
              />
            ) : null}
          </Col>
        </Card>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING.xl,
  },
  greenTopCell: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md + 4,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  iconEmoji: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  cancelBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xs,
  },
  formCard: {
    padding: SPACING.md,
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
