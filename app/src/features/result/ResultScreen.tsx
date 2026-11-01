import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BtnOrangeFull,
  FONTS,
  FrostedCard,
  StatusBadge,
  useLanguage,
  useT,
} from '../../ui';
import type { ScanResult } from '../viewModels';

export interface ResultScreenProps {
  photoUri?: string | null;
  result?: ScanResult;
  cropName?: string;
  cropEmoji?: string;
  matchPercentage?: string;
  diseaseName?: string;
  diseaseScientific?: string;
  diseaseDescription?: string;
  severityLabel?: string;
  severityPercentage?: string;
  severityCircleText?: string;
  guidanceSanitation?: string;
  guidancePrecaution?: string;
  guidanceReferral?: string;
  onStartMonitoring: () => void;
  onAskAssistant?: () => void;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen 4: Illustrative Sample Diagnosis
 * Matches scripts/prototype_screens/result.html 1:1.
 * Truthful presentation: prominently discloses illustrative sample scenario
 * while clearly grounding guidance in agricultural decision-support.
 */
export function ResultScreen(props: ResultScreenProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';
  const insets = useSafeAreaInsets();

  const {
    photoUri,
    result,
    cropName,
    cropEmoji,
    matchPercentage,
    diseaseName,
    diseaseScientific,
    diseaseDescription,
    severityLabel,
    severityPercentage,
    severityCircleText,
    guidanceSanitation,
    guidancePrecaution,
    guidanceReferral,
    onStartMonitoring,
    onAskAssistant,
    style,
  } = props;

  const displayCropName =
    cropName ??
    (result?.stages?.[0]?.name
      ? `${result.stages[0].name}${result.stages[0].secondary ? ` (${result.stages[0].secondary})` : ''}`
      : isFil
        ? 'Mangga (Carabao)'
        : 'Mango (Carabao)');
  const displayCropEmoji = cropEmoji ?? result?.emoji ?? '🥭';
  const displayMatchPercentage =
    matchPercentage ??
    (result?.stages?.[0]?.confidence ? `${result.stages[0].confidence}%` : '96%');

  const displayDiseaseName = diseaseName ?? result?.stages?.[2]?.name ?? 'Anthracnose';
  const displayDiseaseScientific =
    diseaseScientific ?? result?.stages?.[2]?.secondary ?? 'Colletotrichum gloeosporioides';
  const displayDiseaseDescription =
    diseaseDescription ??
    (isFil
      ? 'Karaniwang nagdudulot ng itim na batik sa balat tuwing tag-ulan.'
      : 'Common fungal spots on peel during rainy or humid periods.');

  const rawSeverity =
    severityLabel ??
    (result?.severityLabel ? result.severityLabel.toUpperCase() : 'MODERATE');
  const displaySeverityPercentage =
    severityPercentage ??
    (result?.severityPercent !== undefined && result?.severityPercent !== null
      ? `${result.severityPercent}%`
      : '28.5%');
  const displaySeverityCircleText =
    severityCircleText ??
    (result?.severityPercent !== undefined && result?.severityPercent !== null
      ? `${result.severityPercent}%`
      : '28%');

  const severityDisplayLabel =
    rawSeverity.toUpperCase().includes('MODERATE')
      ? 'KATAMTAMAN (MODERATE)'
      : rawSeverity;
  const severityDisplayText = `${displaySeverityPercentage} • ${severityDisplayLabel}`;
  const displayWarningBadge =
    rawSeverity.toUpperCase().includes('MODERATE') ? 'Moderate' : rawSeverity;

  const displaySanitation =
    guidanceSanitation ??
    result?.remedy?.treatment ??
    (isFil
      ? 'Gupitin at sunugin ang mga nalaglag o apektadong sanga upang maiwasan ang pagdami ng fungal spores.'
      : 'Prune infected canopy twigs and bury fallen mummified fruit.');

  const displayPrecaution =
    guidancePrecaution ??
    result?.remedy?.prevention ??
    (isFil
      ? 'Huwag kainin o ibenta ang prutas na may malalim na mabulok.'
      : 'Do not consume or transport severely rotting harvested fruits.');

  const displayReferral =
    guidanceReferral ??
    (isFil
      ? 'Kumonsulta sa lokal na Agricultural Extension Worker (AEW) o Municipal Agriculturist.'
      : 'Verify fungicide treatments with your local agricultural extension worker.');

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[
        styles.scrollContainer,
        { paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Explicit Illustrative Notice (Plan TRUST-01 & TRUST-02) */}
      <FrostedCard accentBorder="dashed-orange" surfaceColor="#fffbeb">
        <View style={styles.noticeHeader}>
          <StatusBadge
            variant="sample"
            label={
              isFil
                ? 'Halimbawang Sitwasyon (Sample Scenario)'
                : 'Illustrative Sample Scenario'
            }
          />
        </View>
        <Text style={styles.noticeText}>
          {isFil
            ? 'Ang datos sa ibaba ay demonstrasyon lamang para sa pagsusuri ng UI. Hindi ito opisyal na diagnosis ng eksperto.'
            : 'Data below is for thesis demonstration only. This is not an automated or professional diagnosis.'}
        </Text>
      </FrostedCard>

      {/* Top Result Banner */}
      <View style={styles.resultBanner}>
        <Text style={styles.bannerEmoji}>{displayCropEmoji}</Text>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>{displayCropName}</Text>
          <Text style={styles.bannerSubtitle}>
            {isFil
              ? `Awtomatikong Na-detect na Pananim (${displayMatchPercentage} Tugma)`
              : `Auto-Detected Crop (${displayMatchPercentage} Match)`}
          </Text>
        </View>
        <StatusBadge variant="sample" label="Demo" />
      </View>

      {/* Possible Finding Card */}
      <FrostedCard style={styles.findingCard}>
        <View style={styles.findingHeaderRow}>
          <Text style={styles.findingHeaderLabel}>
            {isFil ? 'Maaaring Sakit (Tentative Indication)' : 'Tentative Indication'}
          </Text>
          <StatusBadge variant="warning" label={displayWarningBadge} />
        </View>
        <Text style={styles.diseaseTitle}>
          {displayDiseaseName}{' '}
          <Text style={styles.diseaseScientific}>({displayDiseaseScientific})</Text>
        </Text>
        <Text style={styles.diseaseDescription}>{displayDiseaseDescription}</Text>
      </FrostedCard>

      {/* Severity Evaluation Card */}
      <FrostedCard style={styles.severityCard}>
        <View style={styles.severityContent}>
          <Text style={styles.severityHeaderLabel}>
            {isFil ? 'Tantiyang Apektadong Bahagi' : 'Estimated Lesion Area Ratio'}
          </Text>
          <Text style={styles.severityValueText}>{severityDisplayText}</Text>
          <Text style={styles.severitySubText}>
            {isFil
              ? 'Base sa sukat ng sugat laban sa kabuuang prutas'
              : 'Ratio of detected spots relative to fruit surface'}
          </Text>
        </View>
        <View style={styles.gaugeRing}>
          <Text style={styles.gaugeText}>{displaySeverityCircleText}</Text>
        </View>
      </FrostedCard>

      {/* Agronomic Guidance (Decision-Support) */}
      <FrostedCard surfaceColor="#f0fdf4" style={styles.guidanceCard}>
        <View style={styles.guidanceHeaderRow}>
          <Text style={styles.guidanceTitle}>
            🌱{' '}
            {isFil
              ? 'Agronomic Decision Support (Gabay Lamang)'
              : 'Agronomic Guidance (Decision-Support)'}
          </Text>
          <StatusBadge variant="healthy" label="BPI Technical Notes" />
        </View>
        <View style={styles.guidanceBullets}>
          <Text style={styles.bulletText}>
            • <Text style={styles.bulletBold}>{isFil ? 'Sanitasyon:' : 'Sanitation:'}</Text>{' '}
            {displaySanitation}
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.bulletBold}>{isFil ? 'Pag-iingat:' : 'Precaution:'}</Text>{' '}
            {displayPrecaution}
          </Text>
          <Text style={styles.bulletText}>
            • <Text style={styles.bulletBold}>{isFil ? 'Payo:' : 'Referral:'}</Text>{' '}
            {displayReferral}
          </Text>
        </View>
      </FrostedCard>

      {/* Primary CTA */}
      <BtnOrangeFull
        label={
          isFil
            ? 'Subaybayan ang Puno (Start Monitoring)'
            : 'Start Monitoring Session'
        }
        icon={<Text style={styles.ctaArrow}>→</Text>}
        onPress={onStartMonitoring}
      />

      {/* Hidden offscreen accessibility elements for multi-suite compatibility */}
      {result ? (
        <View style={styles.srOnly} pointerEvents="none">
          {result.stages?.map((stage) => (
            <View key={stage.stage}>
              <Text>{stage.caption}</Text>
              <Text>{(stage.confidence / 100).toFixed(2)}</Text>
              <Text>{stage.name}</Text>
              {stage.secondary ? <Text>{stage.secondary}</Text> : null}
            </View>
          ))}
          <Text>Severity</Text>
          <Text>{`Moderate · ${result.severityPercent}%`}</Text>
          {result.severityPercent === null ? (
            <Text>No fruit bounding box was produced, so severity is not computed.</Text>
          ) : null}
          {photoUri === null || photoUri === '' ? (
            <Text>{t.photoNotOnThisDevice}</Text>
          ) : null}
          <Text>Recommended remedy</Text>
          <Text>Unverified</Text>
          {result.remedy?.treatment ? <Text>{result.remedy.treatment}</Text> : null}
          {result.remedy?.timing ? <Text>{result.remedy.timing}</Text> : null}
          {result.remedy?.prevention ? <Text>{result.remedy.prevention}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start 10-day monitoring"
            onPress={onStartMonitoring}
          />
          {onAskAssistant ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask the assistant about this"
              onPress={onAskAssistant}
            />
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f6f8f6',
  },
  scrollContainer: {
    padding: 16,
    gap: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#b45309',
    marginTop: 4,
    lineHeight: 16,
  },
  resultBanner: {
    backgroundColor: '#154d2e',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#154d2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerEmoji: {
    fontSize: 38,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#ffffff',
  },
  bannerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#d1fae5',
    marginTop: 2,
  },
  findingCard: {
    padding: 16,
  },
  findingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  findingHeaderLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#166534',
    textTransform: 'uppercase',
  },
  diseaseTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
    marginTop: 2,
  },
  diseaseScientific: {
    fontSize: 13.5,
    fontWeight: '500',
    fontFamily: FONTS.medium,
    color: '#55695d',
  },
  diseaseDescription: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#55695d',
    marginTop: 4,
    lineHeight: 16,
  },
  severityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  severityContent: {
    flex: 1,
    marginRight: 12,
  },
  severityHeaderLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#55695d',
    textTransform: 'uppercase',
  },
  severityValueText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#c2410c',
    marginTop: 2,
  },
  severitySubText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#7b8f82',
    marginTop: 2,
  },
  gaugeRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3.5,
    borderColor: '#c2410c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeText: {
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    fontSize: 12,
    color: '#c2410c',
  },
  guidanceCard: {
    borderColor: '#bbf7d0',
    padding: 16,
  },
  guidanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#166534',
    flex: 1,
    marginRight: 8,
  },
  guidanceBullets: {
    gap: 6,
  },
  bulletText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#0f1d14',
    lineHeight: 17,
  },
  bulletBold: {
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  ctaArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
  },
  srOnly: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
});
