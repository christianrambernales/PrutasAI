import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AppText,
  BtnForestFull,
  BtnSubtle,
  Chip,
  Col,
  COLORS,
  Divider,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  Row,
  Section,
  SPACING,
  StatusBadge,
  Tile,
} from '../../ui';
import type { ModelRoleId, SupportedFruit } from '../../core/ml/manifest';
import type { ModelRegistry } from '../../core/ml/registry';
import type { ModelRow } from '../viewModels';
import { strings, type Language } from '../../ui/i18n/strings';

type Dictionary = ReturnType<typeof strings>;

function ModelSectionHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <Row accessible accessibilityRole="header" accessibilityLabel={[title, meta].filter(Boolean).join(', ')} justify="space-between" align="baseline" gap={SPACING.sm}>
      <AppText variant="lg">{title}</AppText>
      {meta ? <AppText variant="xs" color={COLORS.textSecondary}>{meta}</AppText> : null}
    </Row>
  );
}

export interface ModelStatusViewProps {
  headline?: string;
  models?: ModelRow[];
  fruits?: ModelRegistry['fruits'];
  manifestVersion?: number;
  t?: Dictionary;
  language?: Language;
  onBack?: () => void;
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
  if (projection && projection.validatedRoles.includes(role)) {
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

export function ModelStatusView({
  headline,
  models = [],
  fruits,
  manifestVersion = 1,
  t: propT,
  language = 'EN',
  onBack,
}: ModelStatusViewProps) {
  const t = propT ?? strings(language);
  const isFil = language === 'FIL' || t.pipelineStagesTitle.includes('Mga Yugto');

  const stage1Ready = models.some(m => m.id === 'fruit_detector' && m.state === 'ready');
  const stage2Ready = models.some(m => m.id.startsWith('variety_') && m.state === 'ready');
  const stage3Ready = models.some(m => m.id === 'disease_detector' && m.state === 'ready');

  const backAction = (
    <BtnSubtle
      label={`← ${isFil ? 'Bumalik' : 'Back'}`}
      textColor="#ffffff"
      onPress={onBack}
      accessibilityLabel={t.goBack}
      style={styles.backBtn}
    />
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1:1 Prototype Green Top Cell */}
      <GreenTopCell
        title={isFil ? 'Katayuan ng AI Model' : 'AI Model Registry'}
        subtitle={isFil ? 'On-Device Inference Pipeline Health' : 'On-Device Neural Pipeline Health'}
        rightAction={backAction}
      />

      {/* 1:1 Prototype Disclosure Card */}
      <FrostedCard accentBorder="amber">
        <Text style={styles.disclosureHeader}>
          ℹ️ {isFil ? 'Yugto ng Thesis Prototype' : 'Thesis Phase Disclosure'}
        </Text>
        <Text style={styles.disclosureText}>
          {isFil
            ? 'Walang model weights file na naka-bundle sa phase na ito. Ang lahat ng pagsusuri ay nagde-degrade nang totoo sa no-model fallback.'
            : 'No model weights are bundled in this current verification phase. Offline flows degrade truthfully to local decision-support.'}
        </Text>
      </FrostedCard>

      {/* 1:1 Prototype Pipeline Stages Card */}
      <FrostedCard>
        <Text style={styles.pipelineTitle} accessibilityRole="header">
          {isFil ? 'Mga Yugto ng Pipeline (Pipeline Stages)' : 'Pipeline Stages'}
        </Text>

        <View style={styles.stageList}>
          {/* Stage 1 */}
          <View style={[styles.stageRow, styles.stageBorderBottom]}>
            <View style={styles.stageContent}>
              <Text style={styles.stageTitle}>Stage 1: Fruit Detector (YOLO)</Text>
              <Text style={styles.stageSub}>Mangga, Saging, Papaya Bounding Boxes</Text>
            </View>
            <StatusBadge
              variant={stage1Ready ? 'healthy' : 'offline'}
              label={stage1Ready ? (isFil ? 'Handa' : 'Ready') : (isFil ? 'Walang Weights' : 'No Weights')}
            />
          </View>

          {/* Stage 2 */}
          <View style={[styles.stageRow, styles.stageBorderBottom]}>
            <View style={styles.stageContent}>
              <Text style={styles.stageTitle}>Stage 2: Variety Classifier</Text>
              <Text style={styles.stageSub}>Carabao/Pico, Lakatan/Saba, Red Lady</Text>
            </View>
            <StatusBadge
              variant={stage2Ready ? 'healthy' : 'offline'}
              label={stage2Ready ? (isFil ? 'Handa' : 'Ready') : (isFil ? 'Walang Weights' : 'No Weights')}
            />
          </View>

          {/* Stage 3 */}
          <View style={styles.stageRow}>
            <View style={styles.stageContent}>
              <Text style={styles.stageTitle}>Stage 3: Disease & Lesion Segmentation</Text>
              <Text style={styles.stageSub}>Anthracnose, Sigatoka, Ringspot</Text>
            </View>
            <StatusBadge
              variant={stage3Ready ? 'healthy' : 'offline'}
              label={stage3Ready ? (isFil ? 'Handa' : 'Ready') : (isFil ? 'Walang Weights' : 'No Weights')}
            />
          </View>
        </View>
      </FrostedCard>

      {/* Detailed Diagnostics & Role Projections (Preserved for full verification and test compatibility) */}
      <Tile>
        <Row gap={SPACING.sm} align="flex-start">
          <Icon name="warning" size={16} color={COLORS.accent} />
          <Col gap={SPACING.xs} style={{ flex: 1 }}>
            <AppText variant="smSemi" accessibilityLiveRegion="polite">{t.modelInferenceUnverified}</AppText>
            <AppText variant="xs" color={COLORS.textSecondary}>
              {t.modelInferenceUnverifiedDetail}
            </AppText>
          </Col>
        </Row>
      </Tile>

      {headline ? (
        <FrostedCard style={{ borderColor: COLORS.severityEarly }}>
          <Row gap={SPACING.sm + 2} align="flex-start">
            <Icon name="info" size={20} color={COLORS.accent} />
            <Col gap={SPACING.xs} style={{ flex: 1 }}>
              <AppText variant="lg" accessibilityRole="header">{headline}</AppText>
              <AppText variant="sm" color={COLORS.textSecondary}>{t.modelStatusFilesDetail}</AppText>
            </Col>
          </Row>
        </FrostedCard>
      ) : null}

      {fruits ? (
        <Section gap={SPACING.sm + 2}>
          <ModelSectionHeading title={t.modelFruitStatus} meta={t.modelsDeclared(models.length)} />
          {FRUITS.map(fruit => (
            <FrostedCard key={fruit.key} style={{ gap: SPACING.sm }}>
              <AppText variant="mdSemi" accessibilityRole="header">{t[fruit.label]}</AppText>
              <Col accessibilityRole="list" gap={SPACING.sm}>
                {ROLE_CHAINS[fruit.key].map((role, index) => {
                  const status = roleStatus(fruit.key, role, models, fruits[fruit.key], t);
                  const roleLabel = t[ROLE_LABELS[role]];
                  return (
                    <React.Fragment key={`${fruit.key}-${role}`}>
                      {index > 0 ? <Divider /> : null}
                      <Row
                        accessible
                        accessibilityRole="text"
                        role="listitem"
                        accessibilityLabel={`${t[fruit.label]}, ${roleLabel}, ${status.label}, ${t.modelStage(index + 1)}`}
                        gap={SPACING.sm}
                        align="center"
                      >
                        <Col gap={2} style={{ flex: 1 }}>
                          <AppText variant="sm">{roleLabel}</AppText>
                          <AppText variant="xs" color={status.color}>{status.label}</AppText>
                        </Col>
                        <Chip label={t.modelStage(index + 1)} tone="outline" />
                      </Row>
                    </React.Fragment>
                  );
                })}
              </Col>
            </FrostedCard>
          ))}
          {models.length === 0 ? (
            <FrostedCard>
              <Col gap={SPACING.xs}>
                <AppText variant="smSemi">{t.noModelsDeclared}</AppText>
                <AppText variant="xs" color={COLORS.textSecondary}>{t.noModelsDeclaredDetail}</AppText>
              </Col>
            </FrostedCard>
          ) : null}
        </Section>
      ) : null}

      <Section gap={SPACING.sm + 2}>
        <ModelSectionHeading title={t.howToImportModels} />
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

      {/* 1:1 Prototype Bottom CTA */}
      <BtnForestFull
        label={`← ${isFil ? 'Bumalik sa Account & Settings' : 'Back to Account & Settings'}`}
        onPress={onBack}
        accessibilityLabel={`← ${isFil ? 'Bumalik sa Account & Settings' : 'Back to Account & Settings'}`}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  backBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  disclosureHeader: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#b45309',
    marginBottom: 4,
  },
  disclosureText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: '#64748b',
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
    marginBottom: 10,
  },
  stageList: {
    flexDirection: 'column',
    gap: 8,
  },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  stageBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  stageContent: {
    flex: 1,
    paddingRight: 8,
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#1e293b',
  },
  stageSub: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: FONTS.regular,
    color: '#64748b',
    marginTop: 2,
  },
});
