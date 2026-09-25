import React from 'react';
import {
  AppText, Card, Chip, Col, COLORS, Divider, Icon, Row, Section, SectionHeader, SPACING, Tile,
} from '../../ui';
import type { ModelRoleId, SupportedFruit } from '../../core/ml/manifest';
import type { ModelRegistry } from '../../core/ml/registry';
import type { ModelRow } from '../viewModels';
import type { strings } from '../../ui/i18n/strings';

type Dictionary = ReturnType<typeof strings>;

export interface ModelStatusViewProps {
  headline: string;
  models: ModelRow[];
  fruits: ModelRegistry['fruits'];
  manifestVersion: number;
  t: Dictionary;
}

const FRUITS: Array<{
  key: SupportedFruit;
  label: 'fruitBanana' | 'fruitMango' | 'fruitPapaya';
}> = [
  { key: 'banana', label: 'fruitBanana' },
  { key: 'mango', label: 'fruitMango' },
  { key: 'papaya', label: 'fruitPapaya' },
];

const ROLE_LABELS: Record<ModelRoleId, 'modelRoleFruit' | 'modelRoleVariety' | 'modelRoleDisease'> = {
  fruit_detector: 'modelRoleFruit',
  variety_banana: 'modelRoleVariety',
  variety_mango: 'modelRoleVariety',
  variety_papaya: 'modelRoleVariety',
  disease_detector: 'modelRoleDisease',
};

const ROLE_CHAINS: Record<SupportedFruit, ModelRoleId[]> = {
  banana: ['fruit_detector', 'variety_banana', 'disease_detector'],
  mango: ['fruit_detector', 'variety_mango', 'disease_detector'],
  papaya: ['fruit_detector', 'variety_papaya', 'disease_detector'],
};

function roleStatus(
  fruit: SupportedFruit,
  role: ModelRoleId,
  models: ModelRow[],
  projection: ModelRegistry['fruits'][SupportedFruit],
  t: Dictionary,
): { label: string; color: string } {
  const model = models.find(candidate => candidate.id === role && candidate.fruits?.includes(fruit));
  if (projection.validatedRoles.includes(role)) {
    const prerequisitesReady = projection.prerequisiteValidatedRoles.includes(role);
    return {
      label: prerequisitesReady ? t.modelBuildValidated : t.modelValidatedPrerequisiteMissing,
      color: prerequisitesReady ? COLORS.healthy : COLORS.accent,
    };
  }
  if (!model) return { label: t.modelNotDeclared, color: COLORS.textLight };
  if (model.state === 'checksum_mismatch') return { label: t.modelValidationFailed, color: COLORS.error };
  return { label: t.modelNotValidated, color: COLORS.textLight };
}

export function ModelStatusView({ headline, models, fruits, manifestVersion, t }: ModelStatusViewProps) {
  return (
    <>
      <Section>
        <Card style={{ gap: SPACING.md - 4, borderColor: COLORS.severityEarly }}>
          <Row gap={SPACING.sm + 2} align="flex-start">
            <Icon name="info" size={20} color={COLORS.accent} />
            <Col gap={SPACING.xs} style={{ flex: 1 }}>
              <AppText variant="lg">{headline}</AppText>
              <AppText variant="sm" color={COLORS.textSecondary}>{t.modelStatusFilesDetail}</AppText>
            </Col>
          </Row>
        </Card>
        <Tile>
          <Row gap={SPACING.sm} align="flex-start">
            <Icon name="warning" size={16} color={COLORS.accent} />
            <Col gap={SPACING.xs} style={{ flex: 1 }}>
              <AppText variant="smSemi">{t.modelInferenceUnverified}</AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>
                {t.modelInferenceUnverifiedDetail}
              </AppText>
            </Col>
          </Row>
        </Tile>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title={t.modelFruitStatus} meta={t.modelsDeclared(models.length)} />
        {FRUITS.map(fruit => (
          <Card key={fruit.key} style={{ gap: SPACING.sm }}>
            <AppText variant="mdSemi">{t[fruit.label]}</AppText>
            {ROLE_CHAINS[fruit.key].map((role, index) => {
              const status = roleStatus(fruit.key, role, models, fruits[fruit.key], t);
              const roleLabel = t[ROLE_LABELS[role]];
              return (
                <React.Fragment key={`${fruit.key}-${role}`}>
                  {index > 0 ? <Divider /> : null}
                  <Row gap={SPACING.sm} align="center">
                    <Col gap={2} style={{ flex: 1 }}>
                      <AppText variant="sm">{roleLabel}</AppText>
                      <AppText variant="xs" color={status.color}>{status.label}</AppText>
                    </Col>
                    <Chip label={t.modelStage(index + 1)} tone="outline" />
                  </Row>
                </React.Fragment>
              );
            })}
          </Card>
        ))}
        {models.length === 0 ? (
          <Card>
            <Col gap={SPACING.xs}>
              <AppText variant="smSemi">{t.noModelsDeclared}</AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>{t.noModelsDeclaredDetail}</AppText>
            </Col>
          </Card>
        ) : null}
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title={t.howToImportModels} />
        <Tile>
          <Row gap={SPACING.sm} align="flex-start">
            <Icon name="info" size={16} color={COLORS.textSecondary} />
            <AppText variant="xs" color={COLORS.textSecondary} style={{ flex: 1 }}>
              {t.howToImportModelsDetail}
            </AppText>
          </Row>
        </Tile>
        <AppText variant="xs" color={COLORS.textLight} center>
          {t.modelManifestVersion(manifestVersion)}
        </AppText>
      </Section>
    </>
  );
}
