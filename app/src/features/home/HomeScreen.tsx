import React from 'react';
import { View } from 'react-native';
import {
  AppText, Button, Card, Chip, Col, COLORS, EmojiBadge, Icon, PressableRow,
  RADIUS, Row, Section, SectionHeader, SHADOWS, SPACING, Tile, useT,
} from '../../ui';
import type { ClimateSnapshot, FruitSummary, ScanSummary } from '../viewModels';
import { ScanRow } from '../components/ScanRow';

export interface HomeScreenProps {
  capabilityHeadline: string;
  capabilityDetail: string;
  readyModelCount: number;
  totalModelCount: number;
  fruits: FruitSummary[];
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
}

export function HomeScreen(props: HomeScreenProps) {
  const t = useT();
  const {
    capabilityHeadline, capabilityDetail, readyModelCount, totalModelCount,
    fruits, climate, recentScans,
  } = props;

  const allReady = readyModelCount === totalModelCount && totalModelCount > 0;

  return (
    <>
      <Row justify="space-between" style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: 14 }}>
        <Col gap={2}>
          <Row gap={SPACING.xs + 3}>
            <Icon name="leaf" size={20} color={COLORS.primary} />
            <AppText variant="xl" color={COLORS.primary}>PrutasAI</AppText>
          </Row>
          <AppText variant="xs" color={COLORS.textSecondary}>
            {t.tagline}
          </AppText>
        </Col>
        <Row gap={SPACING.sm + 2}>
          {/* Was a static label; it now both reports and changes the language. */}
          <PressableRow accessibilityLabel={t.changeLanguage} onPress={props.onToggleLanguage}>
            <Chip label={props.language} />
          </PressableRow>
          <PressableRow accessibilityLabel={t.settings} onPress={props.onOpenSettings}>
            <Icon name="gear" size={22} color={COLORS.textSecondary} />
          </PressableRow>
        </Row>
      </Row>

      <Section>
        <Card>
          <Row gap={SPACING.sm + 2}>
            <Icon
              name={allReady ? 'check' : 'warning'}
              size={20}
              color={allReady ? COLORS.healthy : COLORS.accent}
            />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="smSemi">{capabilityHeadline}</AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>{capabilityDetail}</AppText>
            </Col>
            <Chip
              label={t.modelsCount(readyModelCount, totalModelCount)}
              dotColor={allReady ? COLORS.healthy : COLORS.textLight}
            />
          </Row>
        </Card>
      </Section>

      <Section>
        <Col gap={SPACING.md} style={{ backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.lg - 4, ...SHADOWS.md }}>
          <Row gap={14}>
            <Col gap={SPACING.xs + 2} style={{ flex: 1 }}>
              <AppText variant="xl" color={COLORS.surface}>{t.scanHeadline}</AppText>
              <AppText variant="sm" color="rgba(255,255,255,0.78)">
                {t.scanBlurb}
              </AppText>
            </Col>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={26} color={COLORS.surface} />
            </View>
          </Row>
          <Button label={t.openCamera} icon="camera" variant="accent" onPress={props.onScan} />
        </Col>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title={t.browseFruits} meta={t.fruitsAndVarieties(fruits.length, fruits.reduce((n, f) => n + f.varietyCount, 0))} />
        <Row gap={SPACING.sm} align="stretch">
          {fruits.map(fruit => (
            <PressableRow
              key={fruit.key}
              accessibilityLabel={fruit.nameEn}
              onPress={() => props.onOpenFruit(fruit.key)}
              style={{ flex: 1 }}
            >
              <Card style={{ alignItems: 'center', paddingVertical: 14, paddingHorizontal: SPACING.sm, gap: SPACING.sm + 2 }}>
                <EmojiBadge emoji={fruit.emoji} size={48} />
                <Col gap={2} align="center">
                  <AppText variant="mdSemi">{fruit.nameEn}</AppText>
                  <AppText variant="xs" color={COLORS.textSecondary}>{fruit.nameFil}</AppText>
                  <AppText variant="xs" color={COLORS.textLight}>{t.varietyCount(fruit.varietyCount)}</AppText>
                </Col>
              </Card>
            </PressableRow>
          ))}
        </Row>
      </Section>

      <Section>
        {climate === null ? (
          <PressableRow accessibilityLabel={t.setLocation} onPress={props.onSetLocation}>
            <Card style={{ gap: SPACING.sm }}>
              <Row gap={SPACING.sm} align="flex-start">
                <Icon name="pin" size={18} color={COLORS.textSecondary} />
                <Col gap={2} style={{ flex: 1 }}>
                  <AppText variant="mdSemi">
                    {props.climateLoading ? t.fetchingWeather : t.setLocation}
                  </AppText>
                  <AppText variant="xs" color={COLORS.textSecondary}>
                    {props.climateLoading
                      ? t.fetchingWeatherBlurb
                      : t.setLocationBlurb}
                  </AppText>
                </Col>
                <Icon name="chevronRight" size={18} color={COLORS.textLight} />
              </Row>
            </Card>
          </PressableRow>
        ) : (
        <PressableRow onPress={props.onOpenClimate}>
          <Card style={{ paddingVertical: 14, paddingHorizontal: SPACING.md, gap: SPACING.md - 4 }}>
            <Row gap={SPACING.xs + 2}>
              <Icon name="pin" size={16} color={COLORS.textSecondary} />
              <AppText variant="smSemi" style={{ flex: 1 }}>{climate.place}</AppText>
              <Chip label={climate.freshnessLabel} dotColor={COLORS.stable} />
            </Row>
            <Row gap={SPACING.md - 4}>
              <AppText variant="hero">{climate.temperatureC}°</AppText>
              <Col gap={2} style={{ flex: 1 }}>
                <AppText variant="sm">{climate.condition}</AppText>
                <AppText variant="xs" color={COLORS.textSecondary}>{climate.feelsLikeLabel}</AppText>
              </Col>
              <Icon name="sun" size={30} color={COLORS.accent} />
            </Row>
            <Row gap={SPACING.sm}>
              {[
                { icon: 'droplet' as const, value: `${climate.humidityPct}%`, label: t.humidity },
                { icon: 'cloudRain' as const, value: `${climate.rainTodayMm} mm`, label: t.rainNow },
                { icon: 'mountain' as const, value: `${climate.elevationM} m`, label: t.elevation },
              ].map(stat => (
                <Tile key={stat.label} style={{ flex: 1, alignItems: 'center', gap: SPACING.xs }}>
                  <Icon name={stat.icon} size={16} color={COLORS.textSecondary} />
                  <AppText variant="smSemi">{stat.value}</AppText>
                  <AppText variant="xs" color={COLORS.textSecondary}>{stat.label}</AppText>
                </Tile>
              ))}
            </Row>
            <AppText variant="xs" color={COLORS.textLight}>
              Data: Open-Meteo (CC BY 4.0)
            </AppText>
          </Card>
        </PressableRow>
        )}
      </Section>

      <Section gap={SPACING.sm + 2}>
        <Row justify="space-between" align="baseline">
          <AppText variant="lg">{t.recentScans}</AppText>
          <PressableRow onPress={props.onViewAllScans}>
            <AppText variant="smSemi" color={COLORS.primaryLight}>{t.viewAll}</AppText>
          </PressableRow>
        </Row>
        <Col gap={SPACING.sm}>
          {recentScans.length === 0 ? (
            <AppText variant="sm" color={COLORS.textLight}>{t.noScansYetBlurb}</AppText>
          ) : (
            recentScans.map(scan => (
              <ScanRow key={scan.id} scan={scan} onPress={() => props.onOpenScan(scan.id)} />
            ))
          )}
        </Col>
      </Section>
    </>
  );
}
