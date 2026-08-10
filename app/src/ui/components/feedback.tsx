import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../tokens';
import { AppText, Col, Row } from './primitives';

/** A single-value progress bar, used for model confidence. */
export function Meter({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.meter, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/**
 * The Early / Moderate / Severe bands with a marker at the measured value.
 * Band widths mirror the thresholds in core/severity.
 */
export function SeverityScale({ percent }: { percent: number }) {
  const at = Math.max(0, Math.min(100, percent));
  return (
    <Col gap={SPACING.xs + 2}>
      <View style={styles.track}>
        <View style={[styles.band, { left: '0%', width: '15%', backgroundColor: COLORS.severityEarly }]} />
        <View style={[styles.band, { left: '15%', width: '25%', backgroundColor: COLORS.severityModerate }]} />
        <View style={[styles.band, { left: '40%', width: '60%', backgroundColor: COLORS.severitySevere }]} />
        <View style={[styles.marker, { left: `${at}%` }]} />
      </View>
      <Row justify="space-between">
        <AppText variant="xs" color={COLORS.textLight}>Early &lt;15%</AppText>
        <AppText variant="xs" color={COLORS.textLight}>Moderate 15–40%</AppText>
        <AppText variant="xs" color={COLORS.textLight}>Severe &gt;40%</AppText>
      </Row>
    </Col>
  );
}

/** Twelve-month rainfall normals. Values are millimetres. */
export function MonthlyBars({ values, highlightFrom }: { values: number[]; highlightFrom?: number }) {
  const max = Math.max(...values, 1);
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return (
    <Col gap={5}>
      <Row style={styles.chart} align="flex-end" gap={4}>
        {values.map((v, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(4, (v / max) * 100)}%`,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              backgroundColor:
                highlightFrom !== undefined && v >= highlightFrom ? COLORS.primaryLight : COLORS.stable,
            }}
          />
        ))}
      </Row>
      <Row gap={4}>
        {months.map((m, i) => (
          <AppText key={i} variant="xs" color={COLORS.textLight} center style={{ flex: 1, fontSize: 9 }}>
            {m}
          </AppText>
        ))}
      </Row>
    </Col>
  );
}

export type EvidenceStatus = 'optimal' | 'tolerated' | 'outside' | 'unknown';

const EVIDENCE_TONE: Record<EvidenceStatus, { bg: string; fg: string }> = {
  optimal: { bg: '#e6f2ec', fg: '#1f6146' },
  tolerated: { bg: '#fdf1e3', fg: '#8a4b00' },
  outside: { bg: '#fbe6e6', fg: '#a01c1c' },
  unknown: { bg: COLORS.surfaceAlt, fg: COLORS.textSecondary },
};

export function EvidencePill({ status }: { status: EvidenceStatus }) {
  const tone = EVIDENCE_TONE[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <AppText variant="xsSemi" color={tone.fg} style={{ fontSize: 10 }}>
        {status}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  track: {
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    overflow: 'visible',
  },
  band: { position: 'absolute', top: 0, bottom: 0, borderRadius: RADIUS.full },
  marker: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: COLORS.text,
  },
  chart: { height: 74 },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
});
