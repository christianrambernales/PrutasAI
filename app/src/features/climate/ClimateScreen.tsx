import React from 'react';
import {
  AppText, Card, Chip, Col, COLORS, Divider, EmojiBadge, EvidencePill, Icon,
  MonthlyBars, PressableRow, Row, Section, SPACING, Tile,
} from '../../ui';
import type { ClimateNormals, ClimateSnapshot, Suitability } from '../viewModels';

export interface ClimateScreenProps {
  climate: ClimateSnapshot;
  normals: ClimateNormals;
  suitability: Suitability;
  onChangeLocation: () => void;
}

const VERDICT_COLOR: Record<Suitability['verdict'], string> = {
  suitable: COLORS.healthy,
  potentially_suitable: '#8a4b00',
  unsuitable: COLORS.error,
  insufficient_data: COLORS.textSecondary,
};

export function ClimateScreen({ climate, normals, suitability, onChangeLocation }: ClimateScreenProps) {
  return (
    <>
      <Section>
        <Card>
          <Row gap={SPACING.sm + 2}>
            <Icon name="pin" size={18} color={COLORS.textSecondary} />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="smSemi">{climate.place}</AppText>
              <AppText variant="xs" color={COLORS.textLight}>{climate.coordsLabel}</AppText>
            </Col>
            <PressableRow onPress={onChangeLocation}>
              <Chip label="Change" tone="outline" />
            </PressableRow>
          </Row>
        </Card>
      </Section>

      <Section>
        <Card style={{ gap: SPACING.md - 4 }}>
          <Row justify="space-between">
            <AppText variant="xsSemi" color={COLORS.textSecondary}>RIGHT NOW</AppText>
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
          <AppText variant="xs" color={COLORS.textSecondary}>
            Today’s weather is displayed but never decides a verdict.
          </AppText>
        </Card>
      </Section>

      <Section>
        <Card style={{ gap: SPACING.sm + 2 }}>
          <Row justify="space-between">
            <AppText variant="mdSemi">Monthly rainfall normals</AppText>
            <AppText variant="xs" color={COLORS.textLight}>5-year mean</AppText>
          </Row>
          <MonthlyBars values={normals.monthlyRainMm} highlightFrom={200} />
          <Divider />
          <Row justify="space-between">
            <AppText variant="xs" color={COLORS.textSecondary}>Annual total</AppText>
            <AppText variant="smSemi">{normals.annualRainMm.toLocaleString()} mm</AppText>
          </Row>
          <Row justify="space-between">
            <AppText variant="xs" color={COLORS.textSecondary}>Mean annual temperature</AppText>
            <AppText variant="smSemi">{normals.meanTemperatureC} °C</AppText>
          </Row>
        </Card>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <Row justify="space-between" align="baseline">
          <AppText variant="lg">Can I grow this here?</AppText>
          <Chip label={`${suitability.fruitName} ▾`} tone="outline" />
        </Row>
        <Card style={{ gap: SPACING.sm + 2 }}>
          <Row gap={SPACING.sm + 2}>
            <EmojiBadge emoji={suitability.fruitEmoji} size={40} />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="lg" color={VERDICT_COLOR[suitability.verdict]}>
                {suitability.headline}
              </AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>{suitability.detail}</AppText>
            </Col>
          </Row>
          <Divider />
          <Col>
            {suitability.evidence.map((ev, i) => (
              <Col key={ev.label}>
                {i > 0 ? <Divider /> : null}
                <Row gap={SPACING.sm + 2} style={{ paddingVertical: 9 }}>
                  <Icon name={ev.icon} size={16} color={COLORS.textSecondary} />
                  <Col gap={2} style={{ flex: 1 }}>
                    <AppText variant="sm">{ev.label}</AppText>
                    <AppText variant="xs" color={COLORS.textLight}>{ev.rangeLabel}</AppText>
                  </Col>
                  <Col gap={2} align="flex-end">
                    <AppText variant="smSemi">{ev.value}</AppText>
                    <EvidencePill status={ev.status} />
                  </Col>
                </Row>
              </Col>
            ))}
          </Col>
          <Tile>
            <Col gap={SPACING.xs}>
              <AppText variant="xs" color={COLORS.textSecondary}>{suitability.basisLabel}</AppText>
              <AppText variant="xs" color={COLORS.textLight}>{suitability.sourceLabel}</AppText>
            </Col>
          </Tile>
        </Card>
      </Section>
    </>
  );
}
