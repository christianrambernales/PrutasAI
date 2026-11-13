import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BtnForestFull,
  BtnSubtle,
  FONTS,
  FrostedCard,
  GreenTopCell,
  StatusBadge,
} from '../../ui';
import type { ModelRegistry } from '../../core/ml/registry';
import type { ModelRow } from '../viewModels';
import { strings, type Language } from '../../ui/i18n/strings';

type Dictionary = ReturnType<typeof strings>;

export interface ModelStatusViewProps {
  headline?: string;
  models?: ModelRow[];
  fruits?: ModelRegistry['fruits'];
  manifestVersion?: number;
  t?: Dictionary;
  language?: Language;
  onBack?: () => void;
}

export function ModelStatusView({
  models = [],
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
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
  scroll: {
    flex: 1,
    backgroundColor: '#f2f6f3',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f2f6f3',
    paddingTop: 14,
    paddingHorizontal: 15,
    paddingBottom: 20,
    gap: 14,
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
