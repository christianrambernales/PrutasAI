import React from 'react';
import { View } from 'react-native';
import {
  AppText, Card, Chip, Col, COLORS, Divider, EmojiBadge, Icon, PressableRow,
  RADIUS, Row, Section, SectionHeader, SPACING, useT,
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
  requirements: CropRequirement[];
  requirementsVerified: boolean;
  sources: Source[];
  /** Key of the row currently opened; the design has no separate detail screen. */
  expandedVarietyKey: string | null;
  onOpenVariety: (key: string) => void;
}

export function VarietyInfoScreen(props: VarietyInfoScreenProps) {
  const t = useT();
  const { fruit, modelVarieties, informationOnly, requirements, sources, expandedVarietyKey } = props;

  return (
    <>
      <Section>
        <Row gap={14}>
          <EmojiBadge emoji={fruit.emoji} size={64} />
          <Col gap={2} style={{ flex: 1 }}>
            <AppText variant="xxl">{fruit.nameEn}</AppText>
            <AppText variant="sm" color={COLORS.textSecondary}>{fruit.nameFil}</AppText>
            <AppText variant="xs" color={COLORS.textLight}>
              {t.modelClassesAndStrains(modelVarieties.length, informationOnly.length)}
            </AppText>
          </Col>
        </Row>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title={t.identifiedByModel} meta="stage 2" />
        <Col gap={SPACING.sm}>
          {modelVarieties.map(v => {
            const open = v.key === expandedVarietyKey;
            return (
              <PressableRow
                key={v.key}
                accessibilityLabel={v.nameEn}
                selected={open}
                onPress={() => props.onOpenVariety(v.key)}
              >
                <Card style={open ? { gap: SPACING.sm + 2 } : undefined}>
                  <Row gap={SPACING.md - 4}>
                    <View style={styles.index}>
                      <AppText variant="xsSemi" color={COLORS.primary}>{v.mlClassIndex}</AppText>
                    </View>
                    <Col gap={2} style={{ flex: 1 }}>
                      <AppText variant="mdSemi">{v.nameEn}</AppText>
                      <AppText variant="xs" color={COLORS.textSecondary}>{v.note ?? v.nameFil}</AppText>
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
                  <AppText variant="smSemi">{v.nameEn}</AppText>
                  <AppText variant="xs" color={COLORS.textLight}>→ {v.parentName}</AppText>
                </Row>
              ))}
            </Col>
          </Card>
        </Section>
      ) : null}

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
