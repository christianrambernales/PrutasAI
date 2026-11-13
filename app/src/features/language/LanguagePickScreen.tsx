import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText, Button, Col, COLORS, RADIUS, Row, Section, SPACING, useT } from '../../ui';

export interface LanguagePickScreenProps {
  onPick: (language: 'EN' | 'FIL') => void | Promise<void>;
}

export function LanguagePickScreen({ onPick }: LanguagePickScreenProps) {
  const [selected, setSelected] = useState<'EN' | 'FIL' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const t = useT();

  const handleContinue = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onPick(selected);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setBusy(false);
    }
  };

  return (
    <Section gap={SPACING.lg}>
      <AppText variant="smSemi" color={COLORS.textSecondary}>{t.onboardingStepLanguage}</AppText>
      <Col gap={SPACING.xs}>
        <AppText variant="xl" color={COLORS.primary} accessibilityRole="header">{t.onboardingChooseLanguage}</AppText>
      </Col>
      <AppText variant="sm" color={COLORS.textSecondary}>
        {t.onboardingLanguageHint}
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.languageEnglish}
        accessibilityState={{ selected: selected === 'EN', disabled: busy }}
        disabled={busy}
        onPress={() => setSelected('EN')}
        style={({ pressed }) => [
          styles.option,
          selected === 'EN' ? styles.selectedOption : styles.unselectedOption,
          { opacity: busy ? 0.5 : (pressed ? 0.85 : 1) },
        ]}
      >
        <Row gap={SPACING.sm + 2} align="center">
          <AppText variant="lg">🇺🇸</AppText>
          <Col gap={2} style={{ flex: 1 }}>
            <AppText variant="mdSemi" color={selected === 'EN' ? COLORS.primaryDark : COLORS.text}>
              {t.languageEnglish}
            </AppText>
            <AppText variant="xs" color={COLORS.textSecondary}>
              English
            </AppText>
          </Col>
        </Row>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.languageFilipino}
        accessibilityState={{ selected: selected === 'FIL', disabled: busy }}
        disabled={busy}
        onPress={() => setSelected('FIL')}
        style={({ pressed }) => [
          styles.option,
          selected === 'FIL' ? styles.selectedOption : styles.unselectedOption,
          { opacity: busy ? 0.5 : (pressed ? 0.85 : 1) },
        ]}
      >
        <Row gap={SPACING.sm + 2} align="center">
          <AppText variant="lg">🇵🇭</AppText>
          <Col gap={2} style={{ flex: 1 }}>
            <AppText variant="mdSemi" color={selected === 'FIL' ? COLORS.primaryDark : COLORS.text}>
              {t.languageFilipino}
            </AppText>
            <AppText variant="xs" color={COLORS.textSecondary}>
              Filipino (Tagalog)
            </AppText>
          </Col>
        </Row>
      </Pressable>

      {error && (
        <Col gap={SPACING.sm}>
          <AppText
            variant="smSemi"
            color={COLORS.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {t.onboardingSaveFailed}
          </AppText>
          <Button label={t.retry} onPress={handleContinue} variant="secondary" />
        </Col>
      )}

      {selected && (
        <Button
          label={t.onboardingContinueToMode}
          onPress={handleContinue}
          disabled={busy}
        />
      )}
      {busy ? (
        <AppText variant="sm" color={COLORS.textSecondary} center accessibilityLiveRegion="polite">
          {t.onboardingSaving}
        </AppText>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.card,
  },
  selectedOption: {
    backgroundColor: COLORS.primarySurface,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  unselectedOption: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
