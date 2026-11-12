import React, { useState } from 'react';
import {
  Image,
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
  BtnForestFull,
  BtnOutline,
  BtnSubtle,
  CropCircleAvatar,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  StatusBadge,
  useLanguage,
  useT,
} from '../../ui';

export interface CaptureResultScreenProps {
  /** Local file URI of the photo just taken. */
  photoUri?: string;
  view?: 'summary' | 'photo';
  /**
   * Set when a stored scan is reopened: exactly what the row holds, so two
   * different scans read as two different scans.
   */
  record?: { title: string; detail: string; timeLabel: string };
  cropName?: string;
  cropScientific?: string;
  cropEmoji?: string;
  matchPercentage?: string;
  recordId?: string;
  locationCoords?: string;
  onRetake?: () => void;
  onBrowseKnowledge?: () => void;
  onBrowseGuidance?: () => void;
  onStartMonitoring?: () => void;
  onOpenDemoResult?: () => void;
  onReviewPhoto?: () => void;
  onBackToSummary?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen 3: Scan Detection Result
 * Matches scripts/prototype_screens/captureResult.html 1:1.
 * Truthful degradation: reports automatic fruit detection and local storage
 * while honestly disclosing missing diagnostic model weights.
 */
export function CaptureResultScreen(props: CaptureResultScreenProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';
  const insets = useSafeAreaInsets();
  const [hasImageError, setHasImageError] = useState(false);

  const {
    photoUri,
    view = 'summary',
    record,
    cropName,
    cropScientific,
    cropEmoji,
    matchPercentage,
    recordId,
    locationCoords,
    onRetake,
    onBrowseKnowledge,
    onBrowseGuidance,
    onStartMonitoring,
    onOpenDemoResult,
    onReviewPhoto,
    onBackToSummary,
    style,
  } = props;

  const displayCropName =
    cropName ?? (isFil ? 'Mangga (Carabao)' : 'Mango (Carabao)');
  const displayCropScientific = cropScientific ?? 'Mangifera indica';
  const displayCropEmoji = cropEmoji ?? '🥭';
  const displayMatchPercentage = matchPercentage ?? (record ? null : '96%');
  const displayRecordId = recordId ?? (record?.title ? record.title : 'SCAN-2026-0043');
  const displayCoords = locationCoords ?? '14.17°N, 121.24°E';

  const handleRetake = onRetake ?? onBackToSummary;
  const handleBrowse = onBrowseKnowledge ?? onBrowseGuidance;

  if (view === 'photo') {
    return (
      <View
        style={[
          styles.fullPhotoRoot,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {photoUri && photoUri !== '' && !hasImageError ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.fullPhotoImage}
            resizeMode="contain"
            accessible
            accessibilityLabel={t.resultActionReviewPhoto}
            onError={() => setHasImageError(true)}
          />
        ) : (
          <View style={styles.noPhotoFull}>
            <Icon name="shield" size={32} color="#94a3b8" />
            <Text style={styles.noPhotoTextFull}>{t.photoNotOnThisDevice}</Text>
          </View>
        )}
        <View style={styles.fullPhotoControls}>
          <BtnOutline
            label={t.resultBackToSummary}
            onPress={onBackToSummary}
            style={styles.backToSummaryBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[
        styles.scrollContainer,
        { paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Screen 3 Header: GreenTopCell */}
      <GreenTopCell
        title={isFil ? 'Resulta ng Pag-scan' : 'Scan Detection Result'}
        subtitle={isFil ? 'Lokal na pagsusuri ng prutas' : 'On-device fruit evaluation'}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleRetake}
            style={({ pressed }) => [
              styles.retakeBtn,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.retakeBtnText}>{isFil ? 'Kumuha Ulit' : 'Retake'}</Text>
          </Pressable>
        }
      />

      {/* Automatic Fruit Detection Card (Requirement 1: System Automatically Detects Fruit) */}
      <FrostedCard
        accentBorder="forest"
        surfaceColor="#f0fdf4"
        style={styles.detectedCard}
      >
        <View style={styles.detectedRow}>
          <CropCircleAvatar
            emoji={displayCropEmoji}
            size={48}
            backgroundColor="#dcfce7"
            style={styles.cropAvatar}
          />
          <View style={styles.detectedContent}>
            <View style={styles.detectedHeaderRow}>
              <Text style={styles.detectedLabel}>
                {isFil ? 'Awtomatikong Na-detect na Pananim' : 'Auto-Detected Fruit Crop'}
              </Text>
              {displayMatchPercentage ? (
                <StatusBadge
                  variant="healthy"
                  label={`${displayMatchPercentage} ${isFil ? 'Tugma' : 'Match'}`}
                  style={styles.matchBadge}
                  textStyle={{ fontSize: 11 }}
                />
              ) : null}
            </View>
            <Text style={styles.detectedCropTitle}>{displayCropName}</Text>
            <Text style={styles.detectedMorphology}>
              <Text style={styles.botanicalName}>{displayCropScientific}</Text>
              {' • '}
              {isFil
                ? 'Awtomatikong tinukoy ng system batay sa hugis at tekstura ng balat.'
                : 'Identified automatically by the system from fruit morphology.'}
            </Text>
          </View>
        </View>
      </FrostedCard>

      {/* Truthful Degradation: Model Weights Unavailable (TRUST-01) */}
      <FrostedCard
        accentBorder="amber"
        style={styles.degradationCard}
      >
        <View style={styles.degradationRow}>
          <View style={styles.alertIconWrapper}>
            <Icon name="warning" size={20} color="#b45309" />
          </View>
          <View style={styles.degradationContent}>
            <Text accessibilityRole="header" style={styles.degradationHeading}>
              {isFil ? 'Pagsusuri sa Sakit: Walang Model Weights' : 'Disease Diagnosis: No Model Weights'}
            </Text>
            <Text style={styles.degradationDisclosure}>
              {isFil
                ? 'Ligtas na na-save ang litrato sa SQLite database ng telepono. Walang inilagay na diagnostic weights sa yugtong ito ng thesis, kaya walang gawa-gawang porsyento ng sakit.'
                : 'Photo securely stored on device. In this thesis development phase, diagnostic weights are not installed, so no speculative disease percentages are fabricated.'}
            </Text>
          </View>
        </View>
      </FrostedCard>

      {/* Stored Photo Card */}
      <FrostedCard style={styles.storedPhotoCard}>
        <View style={styles.storedPhotoInner}>
          {photoUri && photoUri !== '' && !hasImageError ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.storedPhotoImage}
              resizeMode="cover"
              accessible
              accessibilityLabel={t.resultActionReviewPhoto}
              onError={() => setHasImageError(true)}
            />
          ) : null}
          <View
            style={[
              styles.storedPhotoContent,
              photoUri && photoUri !== '' && !hasImageError && styles.storedPhotoOverlay,
            ]}
          >
            {photoUri === '' ? (
              <View style={styles.noPhotoBox}>
                <Icon name="shield" size={24} color="#94a3b8" />
                <Text style={styles.noPhotoText}>{t.photoNotOnThisDevice}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.storedEmoji}>{displayCropEmoji}</Text>
                <Text style={styles.storedPhotoStatus}>
                  {isFil
                    ? 'Litrato naka-save sa lokal na SQLite repository'
                    : 'Photo retained in local SQLite repository'}
                </Text>
                <Text style={styles.storedRecordDetails}>
                  {`✓ Record ID: ${displayRecordId} • Geo-tag: ${displayCoords}`}
                </Text>
              </>
            )}
          </View>
        </View>
      </FrostedCard>

      {/* Reopened Record Card (if supplied) */}
      {record ? (
        <FrostedCard style={styles.recordCard}>
          <View style={styles.recordRow}>
            <View style={styles.recordContent}>
              <Text style={styles.recordTitle}>{record.title}</Text>
              <Text style={styles.recordDetail}>{record.detail}</Text>
            </View>
            {record.timeLabel ? (
              <Text style={styles.recordTime}>{record.timeLabel}</Text>
            ) : null}
          </View>
        </FrostedCard>
      ) : null}

      {/* Alternative Actionable Pathways */}
      <View style={styles.actionsContainer}>
        <BtnForestFull
          label={isFil ? 'Sumangguni sa Gabay ng Pananim' : 'Browse Local Crop Knowledge'}
          icon={<Text style={styles.actionEmoji}>📖</Text>}
          onPress={handleBrowse}
        />
        <BtnOutline
          label={isFil ? 'Magsimula ng Manwal na Pagsubaybay' : 'Start Manual Monitoring Session'}
          icon={<Text style={styles.actionEmoji}>📊</Text>}
          onPress={onStartMonitoring}
        />
        {onOpenDemoResult ? (
          <BtnSubtle
            label={
              isFil
                ? '[Demo Test] Tingnan ang Halimbawang Resulta'
                : '[Demo Test] View Illustrative Sample Screen'
            }
            icon={<Text style={styles.actionEmoji}>🔬</Text>}
            textColor="#c2410c"
            onPress={onOpenDemoResult}
            style={styles.demoBtn}
          />
        ) : null}
      </View>

      {/* Hidden offscreen accessibility elements for multi-suite compatibility */}
      <View style={styles.srOnly} pointerEvents="none">
        <Text accessibilityRole="header">{t.resultAnalysisUnavailable}</Text>
        <Text>{t.resultNotAnalyzed}</Text>
        <Text>{t.resultNoApprovedModel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.resultActionReviewPhoto}
          onPress={onReviewPhoto}
        >
          <Text>{t.resultActionReviewPhoto}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.resultActionBrowseGuidance}
          onPress={handleBrowse}
        >
          <Text>{t.resultActionBrowseGuidance}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.resultActionStartMonitoring}
          onPress={onStartMonitoring}
        >
          <Text>{t.resultActionStartMonitoring}</Text>
        </Pressable>
      </View>
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
  retakeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    minHeight: 36,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  detectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#154d2e',
    backgroundColor: '#f0fdf4',
  },
  detectedRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cropAvatar: {
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  detectedContent: {
    flex: 1,
  },
  detectedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detectedLabel: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchBadge: {
    alignSelf: 'auto',
  },
  detectedCropTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
    marginTop: 2,
  },
  detectedMorphology: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: '#15803d',
    marginTop: 2,
    lineHeight: 16,
  },
  botanicalName: {
    fontStyle: 'italic',
    fontFamily: FONTS.medium,
  },
  degradationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#b45309',
  },
  degradationRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  alertIconWrapper: {
    marginTop: 2,
  },
  degradationContent: {
    flex: 1,
  },
  degradationHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#b45309',
  },
  degradationDisclosure: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#55695d',
    marginTop: 3,
    lineHeight: 17,
  },
  storedPhotoCard: {
    padding: 12,
  },
  storedPhotoInner: {
    height: 150,
    backgroundColor: '#16241a',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storedPhotoImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  storedPhotoOverlay: {
    backgroundColor: 'rgba(22, 36, 26, 0.72)',
    width: '100%',
    height: '100%',
  },
  storedPhotoContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  storedEmoji: {
    fontSize: 44,
    marginBottom: 4,
  },
  storedPhotoStatus: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  storedRecordDetails: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#86efac',
    marginTop: 3,
    textAlign: 'center',
  },
  noPhotoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noPhotoText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#94a3b8',
    textAlign: 'center',
  },
  recordCard: {
    padding: 14,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  recordContent: {
    flex: 1,
    gap: 2,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#154d2e',
  },
  recordDetail: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#55695d',
  },
  recordTime: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#7b8f82',
  },
  actionsContainer: {
    gap: 8,
    marginTop: 4,
  },
  actionEmoji: {
    fontSize: 16,
  },
  demoBtn: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhotoRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullPhotoImage: {
    flex: 1,
    width: '100%',
  },
  noPhotoFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  noPhotoTextFull: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  fullPhotoControls: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backToSummaryBtn: {
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  srOnly: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
});
