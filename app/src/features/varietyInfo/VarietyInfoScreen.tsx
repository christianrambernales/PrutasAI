import React from 'react';
import { View } from 'react-native';
import {
  AppText, Card, Chip, Col, COLORS, Divider, EmojiBadge, Icon, PressableRow,
  RADIUS, Row, Section, SectionHeader, SPACING, useLanguage, useT,
} from '../../ui';
import type { FruitSummary, Source, VarietySummary } from '../viewModels';

export interface CropRequirement {
  label: string;
  value: string;
  icon: 'thermometer' | 'cloudRain' | 'mountain';
}

export interface VarietyInfoScreenProps {
  fruit: FruitSummary;
  modelVarieties: VarietySummary[];
  /** Rows with is_ml_class = false: shown, never predicted. */
  informationOnly: VarietySummary[];
  diseases: import('../viewModels').DiseaseSummary[];
  requirements: CropRequirement[];
  requirementsVerified: boolean;
  sources: Source[];
  /** Key of the row currently opened; the design has no separate detail screen. */
  expandedVarietyKey: string | null;
  onOpenVariety: (key: string) => void;
}

export function VarietyInfoScreen(props: VarietyInfoScreenProps) {
  const t = useT();
  const language = useLanguage();
  const { fruit, modelVarieties, informationOnly, requirements, sources, expandedVarietyKey } = props;
  const names = (en: string, fil: string) => language === 'FIL'
    ? { primary: fil, alternate: en }
    : { primary: en, alternate: fil };
  const sourceLabel = (source: Source) => [source.citation, source.detail]
    .filter(Boolean)
    .join(' · ');
  const fruitNames = names(fruit.nameEn, fruit.nameFil);

  return (
    <>
      <Section>
        <Row gap={14}>
          <EmojiBadge emoji={fruit.emoji} size={64} />
          <Col gap={2} style={{ flex: 1 }}>
            <AppText variant="xxl">{fruitNames.primary}</AppText>
            {fruitNames.alternate !== fruitNames.primary ? (
              <AppText variant="sm" color={COLORS.textSecondary}>{fruitNames.alternate}</AppText>
            ) : null}
            {fruit.key !== 'unknown' ? (
              <AppText variant="xs" color={COLORS.textLight}>
                {t.modelClassesAndStrains(modelVarieties.length, informationOnly.length)}
              </AppText>
            ) : null}
          </Col>
        </Row>
      </Section>

      {fruit.key === 'unknown' ? (
        <Section gap={SPACING.sm + 2}>
          <Card>
            <AppText variant="sm">{t.unknownFruit}</AppText>
          </Card>
        </Section>
      ) : (
        <>
          <Section gap={SPACING.sm + 2}>
            <SectionHeader title={t.identifiedByModel} meta="stage 2" />
            <Col gap={SPACING.sm}>
          {modelVarieties.map(v => {
            const open = v.key === expandedVarietyKey;
            const varietyNames = names(v.nameEn, v.nameFil);
            return (
              <PressableRow
                key={v.key}
                accessibilityLabel={varietyNames.primary}
                selected={open}
                onPress={() => props.onOpenVariety(v.key)}
              >
                <Card style={open ? { gap: SPACING.sm + 2 } : undefined}>
                  <Row gap={SPACING.md - 4}>
                    <View style={styles.index}>
                      <AppText variant="xsSemi" color={COLORS.primary}>{v.mlClassIndex}</AppText>
                    </View>
                    <Col gap={2} style={{ flex: 1 }}>
                      <AppText variant="mdSemi">{varietyNames.primary}</AppText>
                      <AppText variant="xs" color={COLORS.textSecondary}>{v.note ?? varietyNames.alternate}</AppText>
                    </Col>
                    <Icon name={open ? 'chevronDown' : 'chevronRight'} size={18} color={COLORS.textLight} />
                  </Row>
                  {open ? (
                    <>
                      <Divider />
                      <Col gap={SPACING.sm}>
                        <Row justify="space-between">
                          <AppText variant="xs" color={COLORS.textSecondary}>{t.filipinoName}</AppText>
                          <AppText variant="xsSemi">{v.nameFil}</AppText>
                        </Row>
                        <Row justify="space-between">
                          <AppText variant="xs" color={COLORS.textSecondary}>{t.classIndex}</AppText>
                          <AppText variant="xsSemi">{v.mlClassIndex}</AppText>
                        </Row>
                        <Row justify="space-between">
                          <AppText variant="xs" color={COLORS.textSecondary}>{t.predictedByModel}</AppText>
                          <AppText variant="xsSemi">{t.yes}</AppText>
                        </Row>
                        <AppText variant="xs" color={COLORS.textLight}>
                          Growing detail arrives with crop-requirements.yaml, which is not written
                          yet — nothing variety-specific is claimed until it carries a citation.
                        </AppText>
                      </Col>
                    </>
                  ) : null}
                </Card>
              </PressableRow>
            );
          })}
        </Col>
      </Section>

      {informationOnly.length > 0 ? (
        <Section gap={SPACING.sm + 2}>
          <Row justify="space-between" align="baseline">
            <AppText variant="lg">{t.informationOnly}</AppText>
            <Chip label={t.notPredicted} tone="outline" />
          </Row>
          <Card style={{ gap: SPACING.sm + 2 }}>
            <Row gap={SPACING.sm} align="flex-start">
              <Icon name="info" size={16} color={COLORS.textSecondary} />
              <AppText variant="xs" color={COLORS.textSecondary} style={{ flex: 1 }}>
                Clonal selections that cannot be told apart in a photograph, so the classifier never
                predicts them — they live in the information layer only.
              </AppText>
            </Row>
            <Divider />
            <Col gap={SPACING.sm}>
              {informationOnly.map(v => (
                <Row key={v.key} justify="space-between">
                  <AppText variant="smSemi">{names(v.nameEn, v.nameFil).primary}</AppText>
                  <AppText variant="xs" color={COLORS.textLight}>→ {v.parentName}</AppText>
                </Row>
              ))}
            </Col>
          </Card>
        </Section>
      ) : null}

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title={t.diseases} />
        {props.diseases.length === 0 ? (
          <Card>
            <AppText variant="sm">{t.noVerifiedDiseaseInfo}</AppText>
          </Card>
        ) : (
          <Col gap={SPACING.sm}>
            {props.diseases.map(d => {
              const open = d.key === expandedVarietyKey; // we can reuse expandedVarietyKey or rename to expandedKey
              const diseaseNames = names(d.nameEn, d.nameFil);
              return (
                <PressableRow
                  key={d.key}
                  accessibilityLabel={diseaseNames.primary}
                  selected={open}
                  onPress={() => props.onOpenVariety(d.key)}
                >
                  <Card style={open ? { gap: SPACING.sm + 2 } : undefined}>
                    <Row gap={SPACING.md - 4}>
                      <Col gap={2} style={{ flex: 1 }}>
                        <AppText variant="mdSemi">{diseaseNames.primary}</AppText>
                        {diseaseNames.alternate !== diseaseNames.primary ? (
                          <AppText variant="xs" color={COLORS.textSecondary}>{diseaseNames.alternate}</AppText>
                        ) : null}
                      </Col>
                      <Icon name={open ? 'chevronDown' : 'chevronRight'} size={18} color={COLORS.textLight} />
                    </Row>
                    {open ? (
                      <>
                        <Divider />
                        <Col gap={SPACING.sm}>
                          <AppText variant="sm">
                            {(language === 'FIL' ? d.descriptionFil : d.descriptionEn)
                              || d.descriptionEn || d.descriptionFil || t.noDescription}
                          </AppText>
                          {d.source ? (
                            <AppText variant="xs" color={COLORS.textLight}>
                              {sourceLabel(d.source)}{d.source.retrievedLabel ? ` · ${d.source.retrievedLabel}` : ''}
                            </AppText>
                          ) : null}
                          {d.remedies.length === 0 ? (
                            <AppText variant="xs" color={COLORS.textSecondary}>{t.noApprovedRemedy}</AppText>
                          ) : (
                            d.remedies.map(r => {
                              const remedyNames = names(r.nameEn, r.nameFil);
                              return (
                              <Col key={r.key} gap={2}>
                                <AppText variant="xsSemi">{remedyNames.primary} / {remedyNames.alternate}</AppText>
                                <AppText variant="xs" color={COLORS.textSecondary}>
                                  {(language === 'FIL' ? r.instructionFil : r.instructionEn)
                                    || r.instructionEn || r.instructionFil || t.noDescription}
                                </AppText>
                                {r.source ? (
                                  <AppText variant="xs" color={COLORS.textLight}>
                                    {sourceLabel(r.source)}{r.source.retrievedLabel ? ` · ${r.source.retrievedLabel}` : ''}
                                  </AppText>
                                ) : null}
                              </Col>
                              );
                            })
                          )}
                        </Col>
                      </>
                    ) : null}
                  </Card>
                </PressableRow>
              );
            })}
          </Col>
        )}
      </Section>

      <Section gap={SPACING.sm + 2}>
        <Row justify="space-between" align="baseline">
          <AppText variant="lg">{t.growingConditions}</AppText>
          {!props.requirementsVerified ? <Chip label={t.unverified} tone="warning" /> : null}
        </Row>
        <Card style={{ gap: SPACING.sm + 2 }}>
          {requirements.map((req, i) => (
            <Col key={req.label} gap={SPACING.sm + 2}>
              {i > 0 ? <Divider /> : null}
              <Row gap={SPACING.sm + 2}>
                <Icon name={req.icon} size={18} color={COLORS.textSecondary} />
                <AppText variant="sm" style={{ flex: 1 }}>{req.label}</AppText>
                <AppText variant="smSemi">{req.value}</AppText>
              </Row>
            </Col>
          ))}
          {!props.requirementsVerified ? (
            <>
              <Divider />
              <AppText variant="xs" color={COLORS.textLight}>
                Awaiting agriculturist sign-off — shown with a caveat until crop-requirements.yaml
                carries a citation.
              </AppText>
            </>
          ) : null}
        </Card>
      </Section>

        <Section gap={SPACING.sm + 2}>
          <SectionHeader title={t.sources} />
          <Card style={{ gap: SPACING.sm }}>
            {sources.map((s, i) => (
              <Col key={s.citation} gap={SPACING.sm}>
                {i > 0 ? <Divider /> : null}
                <Col gap={2}>
                  <AppText variant="smSemi">{s.citation}</AppText>
                  <AppText variant="xs" color={COLORS.textSecondary}>{s.detail}</AppText>
                  <AppText variant="xs" color={COLORS.textLight}>{s.retrievedLabel}</AppText>
                </Col>
              </Col>
            ))}
          </Card>
        </Section>
        </>
      )}
    </>
  );
}

const styles = {
  index: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: '#e2ece6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
