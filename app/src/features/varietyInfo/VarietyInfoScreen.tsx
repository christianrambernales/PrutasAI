import React from 'react';
import { View } from 'react-native';
import {
  AppText, Card, Chip, Col, COLORS, Divider, EmojiBadge, Icon, PressableRow,
  RADIUS, Row, Section, SectionHeader, SPACING,
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
  onOpenVariety: (key: string) => void;
}

export function VarietyInfoScreen(props: VarietyInfoScreenProps) {
  const { fruit, modelVarieties, informationOnly, requirements, sources } = props;

  return (
    <>
      <Section>
        <Row gap={14}>
          <EmojiBadge emoji={fruit.emoji} size={64} />
          <Col gap={2} style={{ flex: 1 }}>
            <AppText variant="xxl">{fruit.nameEn}</AppText>
            <AppText variant="sm" color={COLORS.textSecondary}>{fruit.nameFil}</AppText>
            <AppText variant="xs" color={COLORS.textLight}>
              {modelVarieties.length} model classes · {informationOnly.length} information-only strains
            </AppText>
          </Col>
        </Row>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title="Identified by the model" meta="stage 2" />
        <Col gap={SPACING.sm}>
          {modelVarieties.map(v => (
            <PressableRow key={v.key} onPress={() => props.onOpenVariety(v.key)}>
              <Card>
                <Row gap={SPACING.md - 4}>
                  <View style={styles.index}>
                    <AppText variant="xsSemi" color={COLORS.primary}>{v.mlClassIndex}</AppText>
                  </View>
                  <Col gap={2} style={{ flex: 1 }}>
                    <AppText variant="mdSemi">{v.nameEn}</AppText>
                    <AppText variant="xs" color={COLORS.textSecondary}>{v.note ?? v.nameFil}</AppText>
                  </Col>
                  <Icon name="chevronRight" size={18} color={COLORS.textLight} />
                </Row>
              </Card>
            </PressableRow>
          ))}
        </Col>
      </Section>

      {informationOnly.length > 0 ? (
        <Section gap={SPACING.sm + 2}>
          <Row justify="space-between" align="baseline">
            <AppText variant="lg">Information only</AppText>
            <Chip label="not predicted" tone="outline" />
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
          <AppText variant="lg">Growing conditions</AppText>
          {!props.requirementsVerified ? <Chip label="Unverified" tone="warning" /> : null}
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
        <SectionHeader title="Sources" />
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
