import React from 'react';
import {
  AppText, Button, Card, Chip, Col, COLORS, Divider, EmojiBadge, EvidencePill, Icon,
  MonthlyBars, PressableRow, Row, Section, SPACING, Tile, useT,
} from '../../ui';
import type { ClimateNormals, ClimateSnapshot, FruitSummary, Suitability } from '../viewModels';
import type { ClimateStatus } from './useClimate';

export interface ClimateScreenProps {
  /** Null until a location is chosen and the first fetch lands. */
  climate: ClimateSnapshot | null;
  normals: ClimateNormals | null;
  /** Null when no crop-requirement row exists for the selected fruit. */
  suitability: Suitability | null;
  fruits: FruitSummary[];
  selectedFruitKey: string;
  status: ClimateStatus;
  error: string | null;
  hasLocation: boolean;
  onSelectFruit: (key: string) => void;
  onChangeLocation: () => void;
  onRetry: () => void;
}

const VERDICT_COLOR: Record<Suitability['verdict'], string> = {
  suitable: COLORS.healthy,
  potentially_suitable: '#8a4b00',
  unsuitable: COLORS.error,
  insufficient_data: COLORS.textSecondary,
};

export function ClimateScreen(props: ClimateScreenProps) {
  const t = useT();
  const { climate, normals, suitability, fruits, selectedFruitKey, status, error, hasLocation } = props;

  if (!hasLocation) {
    return (
      <Section>
        <Card style={{ gap: SPACING.md - 4 }}>
          <Row gap={SPACING.sm} align="flex-start">
            <Icon name="pin" size={20} color={COLORS.textSecondary} />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="lg">{t.noLocationSet}</AppText>
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

  return (
    <>
      <Section>
        <Card>
          <Row gap={SPACING.sm + 2}>
            <Icon name="pin" size={18} color={COLORS.textSecondary} />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="smSemi">{climate?.place ?? 'Loading…'}</AppText>
              <AppText variant="xs" color={COLORS.textLight}>{climate?.coordsLabel ?? ''}</AppText>
            </Col>
            <PressableRow accessibilityLabel={t.change} onPress={props.onChangeLocation}>
              <Chip label={t.change} tone="outline" />
            </PressableRow>
          </Row>
        </Card>
      </Section>

      {status === 'error' ? (
        <Section>
          <Card style={{ gap: SPACING.sm, borderColor: COLORS.severityEarly }}>
            <Row gap={SPACING.sm} align="flex-start">
              <Icon name="wifiOff" size={18} color={COLORS.accent} />
              <Col gap={2} style={{ flex: 1 }}>
                <AppText variant="mdSemi">{t.climateUnavailable}</AppText>
                <AppText variant="xs" color={COLORS.textSecondary}>
                  {error ?? t.climateUnreachable}
                  {climate ? t.showingLastReading : ''}
                </AppText>
              </Col>
            </Row>
            <Button label={t.tryAgain} icon="refresh" variant="secondary" onPress={props.onRetry} />
          </Card>
        </Section>
      ) : null}

      {status === 'loading' && !climate ? (
        <Section>
          <Card>
            <AppText variant="sm" color={COLORS.textSecondary}>
              {t.fetchingConditions}
            </AppText>
          </Card>
        </Section>
      ) : null}

      {climate ? (
        <Section>
          <Card style={{ gap: SPACING.md - 4 }}>
            <Row justify="space-between">
              <AppText variant="xsSemi" color={COLORS.textSecondary}>{t.rightNow}</AppText>
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
            <AppText variant="xs" color={COLORS.textSecondary}>
              {t.weatherNeverDecides}
            </AppText>
          </Card>
        </Section>
      ) : null}

      {normals ? (
        <Section>
          <Card style={{ gap: SPACING.sm + 2 }}>
            <Row justify="space-between">
              <AppText variant="mdSemi">{t.monthlyNormals}</AppText>
              <AppText variant="xs" color={COLORS.textLight}>{normals.fetchedLabel}</AppText>
            </Row>
            <MonthlyBars values={normals.monthlyRainMm} highlightFrom={200} />
            <Divider />
            <Row justify="space-between">
              <AppText variant="xs" color={COLORS.textSecondary}>{t.annualTotal}</AppText>
              <AppText variant="smSemi">{normals.annualRainMm.toLocaleString()} mm</AppText>
            </Row>
            <Row justify="space-between">
              <AppText variant="xs" color={COLORS.textSecondary}>{t.meanAnnualTemperature}</AppText>
              <AppText variant="smSemi">{normals.meanTemperatureC} °C</AppText>
            </Row>
          </Card>
        </Section>
      ) : null}

      <Section gap={SPACING.sm + 2}>
        <AppText variant="lg">{t.canIGrow}</AppText>
        <Row gap={SPACING.xs + 2} wrap>
          {fruits.map(f => (
            <PressableRow
              key={f.key}
              accessibilityLabel={f.nameEn}
              selected={f.key === selectedFruitKey}
              onPress={() => props.onSelectFruit(f.key)}
            >
              <Chip
                label={`${f.emoji} ${f.nameEn}`}
                tone={f.key === selectedFruitKey ? 'selected' : 'outline'}
              />
            </PressableRow>
          ))}
        </Row>

        {suitability === null ? (
          <Card style={{ gap: SPACING.sm }}>
            <Row gap={SPACING.sm} align="flex-start">
              <Icon name="info" size={18} color={COLORS.textSecondary} />
              <Col gap={2} style={{ flex: 1 }}>
                <AppText variant="mdSemi">{t.noVerdictYet}</AppText>
                <AppText variant="xs" color={COLORS.textSecondary}>
                  {t.noVerdictBlurb}
                </AppText>
              </Col>
            </Row>
          </Card>
        ) : (
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
        )}
      </Section>
    </>
  );
}
