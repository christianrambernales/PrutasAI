import React from 'react';
import { View } from 'react-native';
import {
  AppText, Button, Card, Chip, Col, COLORS, EmojiBadge, Icon, PressableRow,
  RADIUS, Row, Section, SectionHeader, SHADOWS, SPACING, Tile,
} from '../../ui';
import type { ClimateSnapshot, FruitSummary, ScanSummary } from '../viewModels';
import { ScanRow } from '../components/ScanRow';

export interface HomeScreenProps {
  capabilityHeadline: string;
  capabilityDetail: string;
  readyModelCount: number;
  totalModelCount: number;
  fruits: FruitSummary[];
  climate: ClimateSnapshot;
  recentScans: ScanSummary[];
  onScan: () => void;
  onOpenFruit: (key: string) => void;
  onOpenScan: (id: string) => void;
  onOpenSettings: () => void;
  onOpenClimate: () => void;
  onViewAllScans: () => void;
}

export function HomeScreen(props: HomeScreenProps) {
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
            Fruit · variety · disease — works offline
          </AppText>
        </Col>
        <Row gap={SPACING.sm + 2}>
          <Chip label="EN" />
          <PressableRow onPress={props.onOpenSettings}>
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
              label={`${readyModelCount}/${totalModelCount} models`}
              dotColor={allReady ? COLORS.healthy : COLORS.textLight}
            />
          </Row>
        </Card>
      </Section>

      <Section>
        <Col gap={SPACING.md} style={{ backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.lg - 4, ...SHADOWS.md }}>
          <Row gap={14}>
            <Col gap={SPACING.xs + 2} style={{ flex: 1 }}>
              <AppText variant="xl" color={COLORS.surface}>Scan a fruit</AppText>
              <AppText variant="sm" color="rgba(255,255,255,0.78)">
                Point the camera at a banana, mango or papaya — identification runs on your phone.
              </AppText>
            </Col>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={26} color={COLORS.surface} />
            </View>
          </Row>
          <Button label="Open camera" icon="camera" variant="accent" onPress={props.onScan} />
        </Col>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title="Browse fruits" meta={`${fruits.length} fruits · ${fruits.reduce((n, f) => n + f.varietyCount, 0)} varieties`} />
        <Row gap={SPACING.sm} align="stretch">
          {fruits.map(fruit => (
            <PressableRow key={fruit.key} onPress={() => props.onOpenFruit(fruit.key)} style={{ flex: 1 }}>
              <Card style={{ alignItems: 'center', paddingVertical: 14, paddingHorizontal: SPACING.sm, gap: SPACING.sm + 2 }}>
                <EmojiBadge emoji={fruit.emoji} size={48} />
                <Col gap={2} align="center">
                  <AppText variant="mdSemi">{fruit.nameEn}</AppText>
                  <AppText variant="xs" color={COLORS.textSecondary}>{fruit.nameFil}</AppText>
                  <AppText variant="xs" color={COLORS.textLight}>{fruit.varietyCount} varieties</AppText>
                </Col>
              </Card>
            </PressableRow>
          ))}
        </Row>
      </Section>

      <Section>
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
                { icon: 'droplet' as const, value: `${climate.humidityPct}%`, label: 'Humidity' },
                { icon: 'cloudRain' as const, value: `${climate.rainTodayMm} mm`, label: 'Rain today' },
                { icon: 'mountain' as const, value: `${climate.elevationM} m`, label: 'Elevation' },
              ].map(stat => (
                <Tile key={stat.label} style={{ flex: 1, alignItems: 'center', gap: SPACING.xs }}>
                  <Icon name={stat.icon} size={16} color={COLORS.textSecondary} />
                  <AppText variant="smSemi">{stat.value}</AppText>
                  <AppText variant="xs" color={COLORS.textSecondary}>{stat.label}</AppText>
                </Tile>
              ))}
            </Row>
            <AppText variant="xs" color={COLORS.textLight}>
              5-year normals · Data: Open-Meteo (CC BY 4.0)
            </AppText>
          </Card>
        </PressableRow>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <Row justify="space-between" align="baseline">
          <AppText variant="lg">Recent scans</AppText>
          <PressableRow onPress={props.onViewAllScans}>
            <AppText variant="smSemi" color={COLORS.primaryLight}>View all</AppText>
          </PressableRow>
        </Row>
        <Col gap={SPACING.sm}>
          {recentScans.map(scan => (
            <ScanRow key={scan.id} scan={scan} onPress={() => props.onOpenScan(scan.id)} />
          ))}
        </Col>
      </Section>
    </>
  );
}
