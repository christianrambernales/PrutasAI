import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import {
  AppText, Button, Col, COLORS, RADIUS, Section, SPACING, useT,
} from '../../ui';

export interface SignUpScreenProps {
  busy: boolean;
  error: string | null;
  onSignUp: (email: string, password: string) => void;
  onGoToSignIn: () => void;
}

export function SignUpScreen(props: SignUpScreenProps) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Section gap={SPACING.md}>
      <AppText variant="xl">{t.titleSignUp}</AppText>

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

      <Button
        label={props.busy ? t.signingIn : t.signUp}
        onPress={() => { if (!props.busy) props.onSignUp(email, password); }}
      />

      <Pressable onPress={() => { if (!props.busy) props.onGoToSignIn(); }}>
        <AppText variant="sm" color={COLORS.primary}>{t.alreadyHaveAccount}</AppText>
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
