import React from 'react';
import {
  Pressable,
  ScrollView,
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
  Divider,
  EvidencePill,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  RADIUS,
  Row,
  Section,
  SPACING,
  StatusBadge,
  Tile,
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
    suitability,
    fruits,
    selectedFruitKey,
    status = 'ready',
    currentStatus,
    hasLocation = true,
  } = props;

  if (props.hasLocation === false && !props.locationName && !climate) {
    return (
      <Section>
        <Card style={{ gap: SPACING.md - 4 }}>
          <Row gap={SPACING.sm} align="flex-start">
            <Icon name="pin" size={20} color={COLORS.textSecondary} />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="lg" accessibilityRole="header">{t.noLocationSet}</AppText>
              <AppText variant="sm" color={COLORS.textSecondary}>
                {t.noLocationBlurb}
              </AppText>
            </Col>
          </Row>
          <Button label={t.chooseLocation} icon="pin" onPress={props.onChangeLocation} />
        </Card>
      </Section>
    );
  }

  const currentUnavailable = (currentStatus ?? status) === 'error';
  const displayLocation = props.locationName ?? climate?.place ?? 'Davao City, Region XI';
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

      {/* Fruit selection chips if fruits are provided */}
      {fruits && fruits.length > 0 ? (
        <View style={styles.fruitChipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {fruits.map(f => {
              const name = f.key === 'banana' ? t.fruitBanana
                : f.key === 'mango' ? t.fruitMango
                : f.key === 'papaya' ? t.fruitPapaya
                : f.nameEn;
              const selected = f.key === selectedFruitKey;
              return (
                <Pressable
                  key={f.key}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  accessibilityState={{ selected }}
                  onPress={() => props.onSelectFruit?.(f.key)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  style={[
                    styles.fruitChip,
                    selected ? styles.fruitChipSelected : styles.fruitChipDefault,
                  ]}
                >
                  <Text style={[styles.fruitChipText, selected ? styles.fruitChipTextSelected : styles.fruitChipTextDefault]}>
                    {`${f.emoji} ${name}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* 2. Current Weather vs Suitability FrostedCard */}
      <FrostedCard
        accentBorder={suitability ? (suitability.verdict === 'insufficient_data' ? 'amber' : suitability.verdict === 'unsuitable' ? 'severe' : 'healthy') : 'healthy'}
        style={styles.suitabilityCard}
      >
        {climate?.freshnessLabel ? (
          <Row justify="space-between" align="center" style={{ marginBottom: 6 }}>
            <AppText variant="xsSemi" color={COLORS.textSecondary}>{t.rightNow}</AppText>
            <AppText variant="xs" color={COLORS.textSecondary}>
              {isFil ? climate.freshnessLabel.replace(/^Cached/, t.freshnessCached) : climate.freshnessLabel}
            </AppText>
          </Row>
        ) : null}
        <View style={styles.suitabilityHeader}>
          <View style={styles.suitabilityFruitRow}>
            <Text style={styles.suitabilityFruitEmoji}>
              {suitability?.fruitEmoji ?? '🥭'}
            </Text>
            <Text style={styles.suitabilityTitle}>
              {props.suitabilityHeadline ?? suitability?.headline ?? (isFil ? 'Mangga: Angkop sa Kasalukuyan' : 'Mango: Highly Suitable')}
            </Text>
          </View>
          <StatusBadge
            variant={
              suitability?.verdict === 'insufficient_data'
                ? 'warning'
                : suitability?.verdict === 'unsuitable'
                ? 'severe'
                : 'healthy'
            }
            label={
              props.seasonLabel ??
              (suitability?.verdict === 'suitable'
                ? (isFil ? 'Dry Period' : 'Induction Season')
                : suitability?.verdict === 'insufficient_data'
                ? (isFil ? 'Kakulangan ng Datos' : 'Provisional Data')
                : suitability?.verdict === 'unsuitable'
                ? (isFil ? 'Hindi Angkop' : 'Off Season')
                : (isFil ? 'Dry Period' : 'Induction Season'))
            }
          />
        </View>

        <Text style={styles.rationaleText}>
          {props.rationale ?? suitability?.detail ?? (isFil
            ? 'Ang temperatura na 29°C at mababang ulan ay mainam para sa pamumulaklak ng Carabao mango ayon sa PAGASA agronomic models.'
            : 'Current 29°C temperature and lower precipitation window support floral bud development for Carabao mango.')}
        </Text>

        {suitability?.verdict === 'insufficient_data' ? (
          <Card style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', marginTop: 8 }}>
            <Row gap={SPACING.xs} align="center">
              <Icon name="warning" size={16} color="#b45309" />
              <AppText variant="xsSemi" color="#b45309">
                {t.insufficientDataNotice}
              </AppText>
            </Row>
          </Card>
        ) : null}

        {suitability ? (
          <View style={{ marginTop: 8, gap: 4 }}>
            {suitability.provisional !== undefined ? (
              <AppText variant="xs" color="#8a4b00">
                {suitability.provisional !== false ? t.climateProvisionalWarning : t.climateNoCropRequirements}
              </AppText>
            ) : null}
            {(suitability.missingFields?.length ?? 0) > 0 ? (
              <AppText variant="xs" color="#8a4b00">
                {t.climateMissingEvidence((suitability.missingFields ?? []).map(field =>
                  field === 'elevation' ? t.elevation
                    : field === 'temperature' ? t.meanAnnualTemperature
                    : field === 'rainfall' ? t.annualTotal
                    : field === 'crop requirements' ? t.climateCropRequirements
                    : t.climateHistoricalData,
                ).join(', '))}
              </AppText>
            ) : null}
          </View>
        ) : null}

        {suitability?.evidence && suitability.evidence.length > 0 ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 }}>
            {suitability.evidence.map((ev, i) => {
              const statusText = ev.status === 'optimal' ? t.evidenceOptimal
                : ev.status === 'tolerated' ? t.evidenceTolerated
                : ev.status === 'outside' ? t.evidenceOutside
                : t.evidenceUnknown;
              return (
                <View key={ev.label}>
                  {i > 0 ? <Divider /> : null}
                  <Row gap={SPACING.sm + 2} style={{ paddingVertical: 8 }} align="center">
                    <Icon name={ev.icon} size={16} color={COLORS.textSecondary} />
                    <Col gap={2} style={{ flex: 1 }}>
                      <AppText variant="sm">{ev.label}</AppText>
                      <AppText variant="xs" color={COLORS.textSecondary}>{ev.rangeLabel}</AppText>
                    </Col>
                    <Col gap={2} align="flex-end">
                      <AppText variant="smSemi">{ev.value}</AppText>
                      <Row gap={4} align="center">
                        <EvidencePill status={ev.status} />
                        <AppText variant="xs" color={COLORS.textSecondary}>{`(${statusText})`}</AppText>
                      </Row>
                    </Col>
                  </Row>
                </View>
              );
            })}
          </View>
        ) : null}

        {suitability ? (
          <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, gap: 4 }}>
            {suitability.evidenceFetchedAt != null ? (
              <AppText variant="xs" color={COLORS.textSecondary}>
                {suitability.evidenceCached
                  ? t.climateCachedEvidence(new Date(suitability.evidenceFetchedAt).toISOString().slice(0, 10))
                  : t.climateEvidenceUpdated(new Date(suitability.evidenceFetchedAt).toISOString().slice(0, 10))}
              </AppText>
            ) : (
              <AppText variant="xs" color="#8a4b00">
                {t.climateEvidenceDateUnavailable}
              </AppText>
            )}
            <AppText variant="xs" color={COLORS.textSecondary}>
              {suitability.evidencePeriod
                ? t.climateEvidencePeriod(suitability.evidencePeriod.fromYear, suitability.evidencePeriod.toYear)
                : t.climateEvidencePeriodUnavailable}
            </AppText>
            <AppText variant="xs" color={COLORS.textSecondary}>
              {suitability.evidenceSource
                ? t.climateHistoricalSource(suitability.evidenceSource)
                : t.climateEvidenceSourceUnavailable}
            </AppText>
            {suitability.basisLabel ? (
              <Tile style={{ marginTop: 4 }}>
                <Col gap={SPACING.xs}>
                  <AppText variant="xs" color={COLORS.textSecondary}>{suitability.basisLabel}</AppText>
                  <AppText variant="xs" color={COLORS.textSecondary}>{suitability.sourceLabel}</AppText>
                </Col>
              </Tile>
            ) : null}
          </View>
        ) : null}
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
            {normals?.fetchedLabel ?? '1991–2020 Baseline'}
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

        {normals ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, gap: 4 }}>
            <Row justify="space-between">
              <AppText variant="xs" color={COLORS.textSecondary}>{t.annualTotal}</AppText>
              <AppText variant="smSemi">{normals.annualRainMm.toLocaleString()} mm</AppText>
            </Row>
            <Row justify="space-between">
              <AppText variant="xs" color={COLORS.textSecondary}>{t.meanAnnualTemperature}</AppText>
              <AppText variant="smSemi">{normals.meanTemperatureC} °C</AppText>
            </Row>
          </View>
        ) : null}
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
