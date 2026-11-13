import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppText,
  BtnForestFull,
  BtnSubtle,
  Button,
  Card,
  Col,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  Row,
  SPACING,
  StatusBadge,
  useLanguage,
  useT,
} from '../../ui';
import type { ClimateNormals, ClimateSnapshot, FruitSummary, Suitability } from '../viewModels';
import type { ClimateEndpointStatus, ClimateStatus } from './useClimate';

export interface ClimateScreenProps {
  /** Null until a location is chosen and the first fetch lands. */
  climate?: ClimateSnapshot | null;
  normals?: ClimateNormals | null;
  /** Null when no crop-requirement row exists for the selected fruit. */
  suitability?: Suitability | null;
  fruits?: FruitSummary[];
  selectedFruitKey?: string;
  status?: ClimateStatus;
  currentStatus?: ClimateEndpointStatus;
  error?: string | null;
  hasLocation?: boolean;
  onSelectFruit?: (key: string) => void;
  onChangeLocation?: () => void;
  onRetry?: () => void;
  onBackHome?: () => void;

  /** Direct / prototype override props */
  selectedLocation?: string;
  locationName?: string;
  suitabilityHeadline?: string;
  seasonLabel?: string;
  rationale?: string;
  humidity?: string;
  rainfall?: string;
  elevation?: string;
}

const DEFAULT_MONTHLY_NORMALS = [85, 70, 95, 140, 210, 235, 220, 195, 185, 210, 155, 110];
const MONTH_LABELS = ['Ene', 'Peb', 'Mar', 'Abr', 'May', 'Hun', 'Hul', 'Ago', 'Sep', 'Okt', 'Nob', 'Dis'];

export function ClimateScreen(props: ClimateScreenProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';

  const {
    climate,
    normals,
    status = 'ready',
    currentStatus,
  } = props;

  const currentUnavailable = (currentStatus ?? status) === 'error';
  const displayLocation =
    props.selectedLocation ?? props.locationName ?? climate?.place ?? 'Davao City, Region XI';
  const humidityVal = props.humidity ?? (climate ? `${climate.humidityPct}%` : '78%');
  const rainfallVal = props.rainfall ?? (climate ? `${climate.rainTodayMm} mm` : '1.4 mm');
  const elevationVal = props.elevation ?? (climate ? (climate.elevationM === null ? t.climateMissingElevation : `${climate.elevationM} m`) : '32 m');

  const monthlyData = normals?.monthlyRainMm ?? DEFAULT_MONTHLY_NORMALS;
  const maxRain = Math.max(...monthlyData, 250);

  return (
    <View style={styles.container}>
      {/* 1. GreenTopCell */}
      <GreenTopCell
        title={isFil ? 'Panahon & Kaangkupan' : 'Climate & Suitability'}
        subtitle={`📍 ${displayLocation}`}
        rightAction={
          <BtnSubtle
            label={isFil ? 'Palitan' : 'Change'}
            textColor="#ffffff"
            style={styles.changeBtn}
            onPress={props.onChangeLocation}
            accessibilityLabel={isFil ? 'Palitan ang lokasyon' : 'Change location'}
          />
        }
      />

      {/* Error / unavailable banner */}
      {status === 'error' || currentUnavailable ? (
        <Card style={{ gap: SPACING.sm, borderColor: COLORS.severityEarly }}>
          <Row gap={SPACING.sm} align="flex-start">
            <Icon name="wifiOff" size={18} color={COLORS.accent} />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="mdSemi" accessibilityRole="alert" accessibilityLiveRegion="polite">
                {t.climateUnavailable}
              </AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>
                {t.climateUnreachable}
                {climate ? `${t.showingLastReading} (${climate.freshnessLabel})` : ''}
              </AppText>
            </Col>
          </Row>
          <Button label={t.tryAgain} icon="refresh" variant="secondary" onPress={props.onRetry} />
        </Card>
      ) : null}

      {/* Loading state */}
      {status === 'loading' ? (
        <Card>
          <AppText variant="mdSemi">{t.fetchingWeather}</AppText>
          <AppText
            variant="sm"
            color={COLORS.textSecondary}
            accessibilityRole="progressbar"
            accessibilityLabel={t.fetchingConditions}
            accessibilityState={{ busy: true }}
            accessibilityLiveRegion="polite"
          >
            {t.fetchingConditions}
          </AppText>
        </Card>
      ) : null}

      {/* 2. Current Weather vs Suitability FrostedCard */}
      <FrostedCard
        accentBorder="healthy"
        style={styles.suitabilityCard}
      >
        <View style={styles.suitabilityHeader}>
          <View style={styles.suitabilityFruitRow}>
            <Text style={styles.suitabilityFruitEmoji}>🥭</Text>
            <AppText
              variant="mdSemi"
              color={COLORS.primary}
              style={styles.suitabilityTitle}
            >
              {props.suitabilityHeadline ?? (isFil ? 'Mangga: Angkop sa Kasalukuyan' : 'Mango: Highly Suitable')}
            </AppText>
          </View>
          <StatusBadge
            variant="healthy"
            label={
              props.seasonLabel ??
              (isFil ? 'Dry Period' : 'Induction Season')
            }
          />
        </View>

        <Text style={styles.rationaleText}>
          {props.rationale ?? (isFil
            ? 'Ang temperatura na 29°C at mababang ulan ay mainam para sa pamumulaklak ng Carabao mango ayon sa PAGASA agronomic models.'
            : 'Current 29°C temperature and lower precipitation window support floral bud development for Carabao mango.')}
        </Text>
      </FrostedCard>

      {/* 3. Climate Metrics with Clear Units (3-Column Grid) */}
      <FrostedCard style={styles.metricsCard}>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricEmoji}>💧</Text>
            <Text style={styles.metricValue}>{humidityVal}</Text>
            <Text style={styles.metricLabel}>{isFil ? 'Halumigmig' : 'Humidity'}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricEmoji}>🌧️</Text>
            <Text style={styles.metricValue}>{rainfallVal}</Text>
            <Text style={styles.metricLabel}>{isFil ? 'Ulan (Rain)' : 'Rainfall'}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricEmoji}>⛰️</Text>
            <Text style={styles.metricValue}>{elevationVal}</Text>
            <Text style={styles.metricLabel}>{isFil ? 'Taas (ASL)' : 'Elevation'}</Text>
          </View>
        </View>
      </FrostedCard>

      {/* 4. 12-Month Climate Normals Histogram */}
      <FrostedCard style={styles.normalsCard}>
        <View style={styles.normalsHeader}>
          <Text style={styles.normalsTitle}>
            {isFil ? '12-Buwang Karaniwang Ulan (Open-Meteo Normals)' : '12-Month Rainfall Normals'}
          </Text>
          <Text style={styles.baselineLabel}>
            1991–2020 Baseline
          </Text>
        </View>

        <View
          style={styles.histogramContainer}
          accessible={true}
          accessibilityRole="image"
          accessibilityLabel="12-Month rainfall histogram"
        >
          {monthlyData.map((val, idx) => {
            const heightPct = Math.max(15, Math.min(100, Math.round((val / maxRain) * 100)));
            let barColor = '#0284c7';
            if (heightPct >= 90 || val >= 215) {
              barColor = '#154d2e';
            } else if (heightPct >= 50 || val >= 140) {
              barColor = '#166534';
            }
            return (
              <View
                key={idx}
                style={[
                  styles.histogramBar,
                  {
                    height: `${heightPct}%`,
                    backgroundColor: barColor,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.monthLabelsRow}>
          {MONTH_LABELS.map((m, idx) => (
            <Text key={idx} style={styles.monthLabelText}>{m}</Text>
          ))}
        </View>
      </FrostedCard>

      {/* 5. Action CTA */}
      <BtnForestFull
        label={`← ${isFil ? 'Bumalik sa Home' : 'Back to Home'}`}
        onPress={props.onBackHome}
        testID="back-to-home-btn"
        accessibilityLabel={isFil ? 'Bumalik sa Home' : 'Back to Home'}
        style={{ marginTop: 4 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  changeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 36,
    justifyContent: 'center',
  },
  fruitChipsRow: {
    paddingVertical: 2,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  fruitChip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fruitChipDefault: {
    backgroundColor: '#e2e8f0',
  },
  fruitChipSelected: {
    backgroundColor: '#154d2e',
  },
  fruitChipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  fruitChipTextDefault: {
    color: '#334155',
  },
  fruitChipTextSelected: {
    color: '#ffffff',
  },
  suitabilityCard: {
    padding: 16,
  },
  suitabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  suitabilityFruitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  suitabilityFruitEmoji: {
    fontSize: 24,
  },
  suitabilityTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
    flex: 1,
  },
  rationaleText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONTS.regular,
    color: '#6b7280',
    marginTop: 4,
  },
  metricsCard: {
    padding: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#f8faf9',
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#6b7280',
    marginTop: 2,
  },
  normalsCard: {
    padding: 16,
  },
  normalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  normalsTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
    flex: 1,
  },
  baselineLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#6b7280',
    marginLeft: 6,
  },
  histogramContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 80,
    borderBottomWidth: 1.5,
    borderBottomColor: '#cbd5e1',
    paddingTop: 8,
  },
  histogramBar: {
    flex: 1,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  monthLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  monthLabelText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#6b7280',
  },
});
