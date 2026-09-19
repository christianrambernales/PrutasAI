import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import {
  AppText, Button, Col, COLORS, RADIUS, Section, SPACING, useT,
} from '../../ui';

export interface AccountScreenProps {
  email: string | null;
  userId?: string | null;
  busy: boolean;
  error: string | null;
  resetMessage: string | null;
  confirmationPendingEmail?: string | null;
  onSignIn: (email: string, password: string) => void;
  onForgotPassword: (email: string) => void;
  onCreateAccount: () => void;
  onSignOut: () => void;
  onResendConfirmation?: (email?: string) => void;
  onContinueOffline?: () => void;
}

export function AccountScreen(props: AccountScreenProps) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (props.email !== null) {
    return (
      <Section gap={SPACING.md}>
        <AppText variant="md">{t.signedInAs(props.email)}</AppText>
        <Button label={t.signOut} onPress={props.onSignOut} />
      </Section>
    );
  }

  if (props.confirmationPendingEmail) {
    return (
      <Section gap={SPACING.md}>
        <AppText variant="xl">{t.checkYourEmail}</AppText>
        <AppText variant="sm" color={COLORS.textSecondary}>
          {t.checkYourEmailDetail(props.confirmationPendingEmail)}
        </AppText>

        {props.resetMessage ? (
          <AppText variant="sm" color={COLORS.primary}>{props.resetMessage}</AppText>
        ) : null}

        {props.error ? (
          <AppText variant="sm" color={COLORS.error}>{props.error}</AppText>
        ) : null}

        <Button
          label={props.busy ? t.resendingConfirmation : t.resendConfirmation}
          onPress={() => {
            if (!props.busy && props.onResendConfirmation) {
              props.onResendConfirmation(props.confirmationPendingEmail!);
            }
          }}
        />

        <Button
          variant="secondary"
          label={t.continueOffline}
          onPress={() => {
            if (props.onContinueOffline) props.onContinueOffline();
          }}
        />
      </Section>
    );
  }

  return (
    <Section gap={SPACING.md}>
      <AppText variant="xl">{t.accountSignedOut}</AppText>
      <AppText variant="sm" color={COLORS.textSecondary}>{t.accountSignedOutDetail}</AppText>

      <Col gap={SPACING.sm}>
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.emailLabel}</AppText>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel={t.emailLabel}
        />
        <AppText variant="smSemi" color={COLORS.textSecondary}>{t.passwordLabel}</AppText>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel={t.passwordLabel}
        />
      </Col>

      {props.error ? <AppText variant="sm" color={COLORS.error}>{props.error}</AppText> : null}
      {props.resetMessage ? (
        <AppText variant="sm" color={COLORS.textSecondary}>{props.resetMessage}</AppText>
      ) : null}

      <Button
        label={props.busy ? t.signingIn : t.signIn}
        onPress={() => { if (!props.busy) props.onSignIn(email, password); }}
      />

      <Pressable onPress={() => { if (!props.busy) props.onForgotPassword(email); }}>
        <AppText variant="sm" color={COLORS.primary}>{t.forgotPassword}</AppText>
      </Pressable>

      <Pressable onPress={() => { if (!props.busy) props.onCreateAccount(); }}>
        <AppText variant="sm" color={COLORS.primary}>{t.createAccountPrompt}</AppText>
      </Pressable>
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
