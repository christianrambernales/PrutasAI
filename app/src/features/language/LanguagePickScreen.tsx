import React, { useState } from 'react';
import { AppText, Button, Col, COLORS, Section, SPACING } from '../../ui';
import { strings } from '../../ui/i18n/strings';

export interface LanguagePickScreenProps {
  onPick: (language: 'EN' | 'FIL') => void | Promise<void>;
}

export function LanguagePickScreen({ onPick }: LanguagePickScreenProps) {
  const [selected, setSelected] = useState<'EN' | 'FIL' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const t = strings(selected ?? 'EN');

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
      <AppText variant="smSemi" color={COLORS.textSecondary}>Step 1 of 3: Language / Hakbang 1 sa 3: Wika</AppText>
      <Col gap={SPACING.xs}>
        <AppText variant="xl">Choose your language</AppText>
        <AppText variant="xl">Piliin ang iyong wika</AppText>
      </Col>
      <AppText variant="sm" color={COLORS.textSecondary}>
        You can change this later in Settings. / Puwede mong baguhin ito sa Settings mamaya.
      </AppText>

      <Button
        variant={selected === 'EN' ? 'primary' : 'secondary'}
        label="English"
        onPress={() => setSelected('EN')}
        disabled={busy}
      />
      <Button
        variant={selected === 'FIL' ? 'primary' : 'secondary'}
        label="Filipino"
        onPress={() => setSelected('FIL')}
        disabled={busy}
      />

      {error && (
        <Col gap={SPACING.sm}>
          <AppText variant="smSemi" color={COLORS.error}>Failed to save</AppText>
          <AppText variant="sm">{error.message}</AppText>
          <Button label="Retry" onPress={handleContinue} variant="secondary" />
        </Col>
      )}

      {selected && (
        <Button
          label={busy ? 'Saving...' : t.onboardingContinueToMode}
          onPress={handleContinue}
          disabled={busy}
        />
      )}
    </Section>
  );
}
