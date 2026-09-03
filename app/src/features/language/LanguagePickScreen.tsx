import React from 'react';
import { AppText, Button, Col, COLORS, Section, SPACING } from '../../ui';

export interface LanguagePickScreenProps {
  onPick: (language: 'EN' | 'FIL') => void;
}

/**
 * Shown once, before the language dictionary can be picked, so its own copy
 * is bilingual rather than defaulting silently to one language over the
 * other.
 */
export function LanguagePickScreen({ onPick }: LanguagePickScreenProps) {
  return (
    <Section gap={SPACING.lg}>
      <Col gap={SPACING.xs}>
        <AppText variant="xl">Choose your language</AppText>
        <AppText variant="xl">Piliin ang iyong wika</AppText>
      </Col>
      <AppText variant="sm" color={COLORS.textSecondary}>
        You can change this later in Settings. / Puwede mong baguhin ito sa Settings mamaya.
      </AppText>

      <Button label="English" onPress={() => onPick('EN')} />
      <Button variant="secondary" label="Filipino" onPress={() => onPick('FIL')} />
    </Section>
  );
}
