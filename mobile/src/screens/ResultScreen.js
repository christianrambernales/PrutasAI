import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, FRUIT_EMOJI } from '../utils/theme';

const SEVERITY_COLORS = {
  healthy: COLORS.healthy,
  early: COLORS.severityEarly,
  moderate: COLORS.severityModerate,
  severe: COLORS.severitySevere,
};

export default function ResultScreen({ route, navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { scan } = route.params;

  const handleStartRecovery = async () => {
    try {
      const result = await api.startRecovery(token, scan.id);
      navigation.navigate('Recovery', { sessionId: result.session.id });
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('results')}</Text>

      {/* Fruit Type & Disease Header */}
      <View style={styles.headerCard}>
        <Text style={styles.fruitEmoji}>{FRUIT_EMOJI[scan.fruitType] || '🍎'}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.fruitType}>{t('fruitType')}: {scan.fruitType?.replace('_', ' ')}</Text>
          <Text style={styles.confidence}>{t('confidence')}: {(scan.fruitConfidence * 100).toFixed(1)}%</Text>
        </View>
      </View>

      {/* Disease Results (Ranked) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('diseaseRanking')}</Text>
        {scan.isHealthy ? (
          <Text style={styles.diseaseName}>✅ {t('healthy')}</Text>
        ) : (
          <>
            {/* Primary Infection */}
            <View style={styles.rankedItem}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#1</Text>
              </View>
              <View style={styles.rankedInfo}>
                <Text style={styles.rankLabel}>{t('primaryInfection')}</Text>
                <Text style={styles.diseaseName}>{scan.disease?.replace('_', ' ')}</Text>
                <Text style={styles.diseaseConf}>
                  {t('confidence')}: {(scan.diseaseConfidence * 100).toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Secondary Infection (if exists) */}
            {scan.secondaryInfection && (
              <View style={[styles.rankedItem, { marginTop: SPACING.md, opacity: 0.8 }]}>
                <View style={[styles.rankBadge, { backgroundColor: COLORS.textSecondary }]}>
                  <Text style={styles.rankBadgeText}>#2</Text>
                </View>
                <View style={styles.rankedInfo}>
                  <Text style={styles.rankLabel}>{t('secondaryInfection')}</Text>
                  <Text style={styles.diseaseNameSmall}>{scan.secondaryInfection.disease?.replace('_', ' ')}</Text>
                  <Text style={styles.diseaseConf}>
                    {t('confidence')}: {(scan.secondaryInfection.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {/* Severity Badge */}
      {!scan.isHealthy && (
        <View style={[styles.severityCard, { borderLeftColor: SEVERITY_COLORS[scan.severity] }]}>
          <Text style={styles.cardTitle}>{t('severity')}</Text>
          <View style={styles.severityRow}>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[scan.severity] }]}>
              <Text style={styles.severityText}>{t(scan.severity)}</Text>
            </View>
            <Text style={styles.severityPct}>{scan.severityPercentage}% affected</Text>
          </View>
        </View>
      )}

      {/* Encircled Image */}
      {scan.encircledImage && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('encircled')}</Text>
          <Image source={{ uri: scan.encircledImage }} style={styles.resultImage} />
        </View>
      )}

      {/* Grad-CAM Heatmap */}
      {scan.heatmapImage && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('heatmap')}</Text>
          <Text style={styles.heatmapDesc}>
            Highlighted regions show areas that influenced the AI's diagnosis
          </Text>
          <Image source={{ uri: scan.heatmapImage }} style={styles.resultImage} />
        </View>
      )}

      {/* Remedy Recommendation */}
      {!scan.isHealthy && scan.remedy && (
        <View style={styles.remedyCard}>
          <Text style={styles.cardTitle}>{t('remedy')}</Text>
          {scan.remedy.treatment && (
            <View style={styles.remedyItem}>
              <Text style={styles.remedyLabel}>💊 {t('treatment')}</Text>
              <Text style={styles.remedyText}>{scan.remedy.treatment}</Text>
            </View>
          )}
          {scan.remedy.timing && (
            <View style={styles.remedyItem}>
              <Text style={styles.remedyLabel}>⏰ {t('timing')}</Text>
              <Text style={styles.remedyText}>{scan.remedy.timing}</Text>
            </View>
          )}
          {scan.remedy.dosage && (
            <View style={styles.remedyItem}>
              <Text style={styles.remedyLabel}>💉 {t('dosage')}</Text>
              <Text style={styles.remedyText}>{scan.remedy.dosage}</Text>
            </View>
          )}
          {scan.remedy.prevention && (
            <View style={styles.remedyItem}>
              <Text style={styles.remedyLabel}>🛡️ {t('prevention')}</Text>
              <Text style={styles.remedyText}>{scan.remedy.prevention}</Text>
            </View>
          )}
        </View>
      )}

      {/* Environmental Advisory */}
      {scan.advisory && (
        <View style={styles.advisoryCard}>
          <Text style={styles.cardTitle}>{t('advisory')}</Text>
          <Text style={styles.advisoryText}>{scan.advisory}</Text>
        </View>
      )}

      {/* Start Recovery Button */}
      {!scan.isHealthy && (
        <TouchableOpacity style={styles.recoveryBtn} onPress={handleStartRecovery}>
          <Text style={styles.recoveryBtnText}>{t('startRecovery')} 📊</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { fontSize: FONTS.sizes.title, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  headerCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.md,
  },
  fruitEmoji: { fontSize: 48 },
  headerInfo: { flex: 1 },
  fruitType: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  confidence: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  cardTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  diseaseName: { fontSize: FONTS.sizes.xl, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
  diseaseConf: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  severityCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, borderLeftWidth: 4, ...SHADOWS.sm,
  },
  severityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  severityBadge: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  severityText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md, textTransform: 'uppercase' },
  severityPct: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  resultImage: { width: '100%', height: 250, borderRadius: RADIUS.md, resizeMode: 'contain', marginTop: SPACING.sm },
  heatmapDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
  remedyCard: {
    backgroundColor: '#f0fdf4', borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: '#bbf7d0',
  },
  remedyItem: { marginBottom: SPACING.md },
  remedyLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 4 },
  remedyText: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 22 },
  advisoryCard: {
    backgroundColor: '#eff6ff', borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: '#bfdbfe',
  },
  advisoryText: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 22 },
  recoveryBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, padding: SPACING.lg,
    alignItems: 'center', ...SHADOWS.md,
  },
  recoveryBtnText: { color: '#fff', fontSize: FONTS.sizes.xl, fontWeight: '800' },
  rankedItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  rankBadge: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  rankedInfo: { flex: 1 },
  rankLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  diseaseNameSmall: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
});
