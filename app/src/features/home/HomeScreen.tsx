import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BtnOrangeFull,
  BtnOutline,
  BtnSubtle,
  CropCircleAvatar,
  CropType,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  StatusBadge,
  useT,
} from '../../ui';
import type { ClimateSnapshot, FruitSummary, ScanSummary } from '../viewModels';

export type HomeFruitItem =
  | FruitSummary
  | {
      key: string;
      name?: string;
      nameEn?: string;
      nameFil?: string;
      emoji: string;
      varietyCount?: number;
      diseaseCount?: number;
    };

export interface ActiveMonitoringSession {
  id?: string;
  crop?: string;
  title: string;
  badgeLabel?: string;
  subtitle?: string;
  emoji?: string;
}

export interface HomeScreenProps {
  capabilityHeadline?: string;
  capabilityDetail?: string;
  readyModelCount?: number;
  totalModelCount?: number;
  fruits: HomeFruitItem[];
  /** Null until a location is chosen — the app shows no weather it has not fetched. */
  climate: ClimateSnapshot | null;
  climateLoading?: boolean;
  onSetLocation: () => void;
  recentScans: ScanSummary[];
  language: string;
  onToggleLanguage: () => void;
  onScan: () => void;
  onOpenFruit: (key: string) => void;
  onOpenScan: (id: string) => void;
  onOpenSettings: () => void;
  onOpenClimate: () => void;
  onViewAllScans: () => void;
  onOpenChat?: () => void;
  onOpenMonitoring?: () => void;
  onPickFromGallery?: () => void;
  activeMonitoring?: ActiveMonitoringSession | null;
  style?: StyleProp<ViewStyle>;
}

export function HomeScreen(props: HomeScreenProps) {
  const t = useT();
  const isFil = props.language === 'FIL';

  // Supported crops: Mango, Banana, Papaya
  const cropDefinitions = [
    { key: 'mango', emoji: '🥭', nameEn: 'Mango', nameFil: 'Mangga', varieties: 'Carabao, Pico' },
    { key: 'banana', emoji: '🍌', nameEn: 'Banana', nameFil: 'Saging', varieties: 'Lakatan, Saba' },
    { key: 'papaya', emoji: '🍈', nameEn: 'Papaya', nameFil: 'Papaya', varieties: 'Red Lady, Solo' },
  ];

  const crops = cropDefinitions.map(def => {
    const matched = props.fruits?.find(f => f.key.toLowerCase() === def.key);
    const fruitName = matched && 'name' in matched && typeof matched.name === 'string' ? matched.name : undefined;
    return {
      key: def.key,
      emoji: matched?.emoji ?? def.emoji,
      nameEn: matched?.nameEn ?? fruitName ?? def.nameEn,
      nameFil: matched?.nameFil ?? fruitName ?? def.nameFil,
      varieties: def.varieties,
    };
  });

  // Active monitoring item
  const hasActiveMonitoring = props.activeMonitoring !== null;
  const monitoringTitle =
    props.activeMonitoring?.title ?? (isFil ? 'Mangga Carabao #042' : 'Mangga Carabao #042');
  const monitoringBadge =
    props.activeMonitoring?.badgeLabel ?? (isFil ? 'Araw 10 Nakatakda' : 'Day 10 Scheduled');
  const monitoringSubtitle =
    props.activeMonitoring?.subtitle ??
    (isFil
      ? 'Obserbasyon: I-log ang kalagayan ngayon'
      : 'Observation: Record current condition');
  const monitoringEmoji = props.activeMonitoring?.emoji ?? '🥭';

  // Latest scan item
  const latestScan = props.recentScans && props.recentScans.length > 0 ? props.recentScans[0] : null;

  // Climate snapshot
  const isClimateUnavailable = props.climate?.freshness === 'unavailable';
  const locationName = props.climate?.place || 'Davao City';
  const tempDisplay =
    props.climate?.temperatureC != null ? `${props.climate.temperatureC}°C` : '29°C';
  const climateTitle = isClimateUnavailable
    ? t.climateUnavailable
    : `${locationName} · ${tempDisplay}`;

  return (
    <View style={[styles.container, props.style]}>
      {/* 1. Top Greeting Header */}
      <GreenTopCell
        badge={{
          label: t.prototypeLocalOffline,
          variant: 'offline',
        }}
        title={t.prototypeGreeting}
        subtitle={t.prototypeTagline}
      />

      {/* 2. Primary Action Card (High-Contrast Orange CTA) */}
      <FrostedCard style={styles.primaryActionCard}>
        <View style={styles.primaryCardHeader}>
          <LinearGradient
            colors={['#c2410c', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cameraIconCircle}
          >
            <Icon name="camera" size={24} color="#ffffff" />
          </LinearGradient>
          <View style={styles.primaryCardText}>
            <Text style={styles.primaryCardTitle}>{t.prototypeTakeChoosePhoto}</Text>
            <Text style={styles.primaryCardSubtitle}>{t.prototypePhotoStorageBlurb}</Text>
          </View>
        </View>
        <View style={styles.actionButtonGroup}>
          <BtnOrangeFull
            label={t.prototypeCameraAction}
            onPress={props.onScan}
            style={styles.actionButton}
          />
          <BtnOutline
            label={t.prototypeGalleryAction}
            onPress={props.onPickFromGallery ?? props.onScan}
            style={styles.actionButton}
          />
        </View>
      </FrostedCard>

      {/* 3. Adaptive Recent Activity */}
      <FrostedCard>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSectionTitle}>{t.prototypeRecentActivity}</Text>
          <BtnSubtle
            label={`${t.prototypeViewHistory} →`}
            accessibilityLabel={t.prototypeViewHistory}
            onPress={props.onViewAllScans}
            textColor="#154d2e"
            style={styles.cardSubtleAction}
          />
        </View>

        {/* Item 1: Active Monitoring Action */}
        {hasActiveMonitoring ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={monitoringTitle}
            onPress={props.onOpenMonitoring}
            style={styles.monitoringItem}
          >
            <View style={styles.monitoringAvatar}>
              <Text style={styles.avatarEmoji}>{monitoringEmoji}</Text>
            </View>
            <View style={styles.itemContent}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {monitoringTitle}
                </Text>
                <StatusBadge variant="warning" label={monitoringBadge} />
              </View>
              <Text style={styles.itemSubtitle} numberOfLines={1}>
                {monitoringSubtitle}
              </Text>
            </View>
            <Icon name="chevronRight" size={16} color="#4f6356" />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFil ? 'Magsimula ng Pagsubaybay' : 'Start Recovery Monitoring'}
            onPress={props.onOpenMonitoring}
            style={styles.monitoringItem}
          >
            <View style={styles.monitoringAvatar}>
              <Text style={styles.avatarEmoji}>🌱</Text>
            </View>
            <View style={styles.itemContent}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {isFil ? 'Magsimula ng Pagsubaybay' : 'Start Recovery Monitoring'}
                </Text>
                <StatusBadge variant="info" label={isFil ? 'Iskedyul' : 'Schedule'} />
              </View>
              <Text style={styles.itemSubtitle} numberOfLines={1}>
                {isFil
                  ? 'Subaybayan ang paggaling ng pananim'
                  : 'Track disease progression and recovery'}
              </Text>
            </View>
            <Icon name="chevronRight" size={16} color="#4f6356" />
          </Pressable>
        )}

        {/* Item 2: Latest Scan Thumbnail / Result */}
        {latestScan ? (
          <Pressable
            key={latestScan.id}
            accessibilityRole="button"
            accessibilityLabel={latestScan.title}
            onPress={() => props.onOpenScan(latestScan.id)}
            style={styles.scanItem}
          >
            <View style={styles.scanAvatar}>
              <Text style={styles.avatarEmoji}>{latestScan.emoji || '🥭'}</Text>
            </View>
            <View style={styles.itemContent}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {latestScan.title}
                </Text>
                <StatusBadge variant="sample" label={isFil ? 'Lokal' : 'Local'} />
              </View>
              <Text style={styles.itemSubtitle} numberOfLines={1}>
                {latestScan.detail ||
                  (isFil ? 'Walang pagsusuri ng sakit' : 'No disease analysis')}
              </Text>
            </View>
            <Text style={styles.itemDate}>{latestScan.timeLabel}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFil ? 'Mangga Carabao' : 'Carabao Mango'}
            onPress={() => props.onOpenScan('demo-sample')}
            style={styles.scanItem}
          >
            <View style={styles.scanAvatar}>
              <Text style={styles.avatarEmoji}>🥭</Text>
            </View>
            <View style={styles.itemContent}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {isFil ? 'Mangga Carabao' : 'Carabao Mango'}
                </Text>
                <StatusBadge variant="sample" label={isFil ? 'Halimbawa' : 'Sample'} />
              </View>
              <Text style={styles.itemSubtitle} numberOfLines={1}>
                {isFil
                  ? 'Halimbawa: Anthracnose (Moderate 28%)'
                  : 'Sample: Anthracnose (Moderate 28%)'}
              </Text>
            </View>
            <Text style={styles.itemDate}>{isFil ? 'Ngayong araw' : 'Today'}</Text>
          </Pressable>
        )}
      </FrostedCard>

      {/* 4. Supported Crops Section */}
      <View style={styles.cropsSection}>
        <View style={styles.cropsHeaderRow}>
          <Text style={styles.cardSectionTitle}>{t.prototypeCropProfiles}</Text>
          <BtnSubtle
            label={`${t.prototypeEncyclopedia} →`}
            onPress={() => props.onOpenFruit('mango')}
            textColor="#154d2e"
            style={styles.cardSubtleAction}
          />
        </View>
        <View style={styles.fruitGrid}>
          {crops.map(crop => (
            <Pressable
              key={crop.key}
              accessibilityRole="button"
              accessibilityLabel={isFil ? crop.nameFil : crop.nameEn}
              onPress={() => props.onOpenFruit(crop.key)}
              style={styles.fruitCard}
            >
              <CropCircleAvatar
                crop={crop.key as CropType}
                emoji={crop.emoji}
                size={40}
                backgroundColor="#eaf4ed"
              />
              <Text style={styles.fruitTitle}>{isFil ? crop.nameFil : crop.nameEn}</Text>
              <Text style={styles.fruitSubtitle}>{crop.varieties}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 5. Compact Climate Snapshot */}
      <FrostedCard
        accentBorder="info"
        onPress={props.onOpenClimate}
        accessibilityRole="button"
        accessibilityLabel={
          props.climateLoading
            ? `${t.setLocation}. ${t.fetchingWeather}`
            : climateTitle
        }
        style={styles.climateCard}
      >
        <View style={styles.climateHeaderRow}>
          <View style={styles.climateLocationRow}>
            <Text style={styles.pinEmoji}>📍</Text>
            <Text style={styles.climateLocationText}>{locationName}</Text>
          </View>
          <StatusBadge
            variant="info"
            label={isFil ? 'Tingnan ang Normals' : 'Climate Normals'}
          />
        </View>

        {isClimateUnavailable ? (
          <View style={styles.climateUnavailableRow}>
            <View style={styles.climateUnavailableTextCol}>
              <Text style={styles.climateUnavailableTitle}>{t.climateUnavailable}</Text>
              <Text style={styles.climateUnavailableSubtitle}>{t.climateUnreachable}</Text>
            </View>
            <Icon name="wifiOff" size={24} color="#b45309" />
          </View>
        ) : (
          <View style={styles.climateBodyRow}>
            <View>
              <Text style={styles.climateTempText}>{tempDisplay}</Text>
              <Text style={styles.climateSubText}>
                {isFil
                  ? 'Naka-cache • Angkop para sa pamumulaklak ng Mangga'
                  : 'Cached • Suitable for Mango flowering'}
              </Text>
            </View>
            <Text style={styles.weatherEmoji}>🌤️</Text>
          </View>
        )}
      </FrostedCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f2f6f3',
    padding: 14,
    gap: 14,
  },
  primaryActionCard: {
    borderWidth: 1.5,
    borderColor: 'rgba(194, 65, 12, 0.25)',
  },
  primaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cameraIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#c2410c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
    flexShrink: 0,
  },
  primaryCardText: {
    flex: 1,
  },
  primaryCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#0f1d14',
  },
  primaryCardSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#3f5246',
    lineHeight: 16,
    marginTop: 2,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
  },
  cardSubtleAction: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  monitoringItem: {
    backgroundColor: '#f8faf9',
    borderWidth: 1,
    borderColor: 'rgba(21, 77, 46, 0.12)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monitoringAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#eaf4ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(21, 77, 46, 0.12)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
    includeFontPadding: false,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#0f1d14',
  },
  itemSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#3f5246',
    marginTop: 2,
  },
  itemDate: {
    fontSize: 11,
    color: '#4f6356',
    fontFamily: FONTS.medium,
  },
  cropsSection: {
    marginTop: 2,
  },
  cropsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  fruitGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  fruitCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(21, 77, 46, 0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    minHeight: 90,
    shadowColor: 'rgba(15, 35, 22, 0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  fruitTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
    textAlign: 'center',
    marginTop: 4,
  },
  fruitSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#4f6356',
    textAlign: 'center',
    marginTop: 2,
  },
  climateCard: {
    cursor: 'pointer',
  },
  climateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  climateLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinEmoji: {
    fontSize: 14,
  },
  climateLocationText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#0f1d14',
  },
  climateBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  climateTempText: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
  },
  climateSubText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#3f5246',
    marginTop: 2,
  },
  weatherEmoji: {
    fontSize: 26,
  },
  climateUnavailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  climateUnavailableTextCol: {
    flex: 1,
    gap: 2,
  },
  climateUnavailableTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#b91c1c',
  },
  climateUnavailableSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#3f5246',
  },
});
