import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AppText, Button, Card, Chip, Col, COLORS, Divider, Icon, Meter, RADIUS, Row,
  Section, SEVERITY_COLOR, SEVERITY_LABEL, SeverityScale, SPACING, StatusChip, Tile,
} from '../../ui';
import type { ScanResult } from '../viewModels';

export interface ResultScreenProps {
  result: ScanResult;
  onStartMonitoring: () => void;
  onAskAssistant: () => void;
}

export function ResultScreen({ result, onStartMonitoring, onAskAssistant }: ResultScreenProps) {
  const { severityLabel, severityPercent, remedy } = result;

  return (
    <>
      <Section>
        <View style={styles.photo}>
          <Text style={styles.subject}>{result.emoji}</Text>
          <View style={styles.bbox}>
            <View style={styles.bboxLabel}>
              <AppText variant="xsSemi" color={COLORS.primaryDark} style={{ fontSize: 10 }}>
                banana · 0.96
              </AppText>
            </View>
          </View>
          <Row justify="space-between" style={styles.overlay} gap={SPACING.sm}>
            <View style={styles.glass}>
              <Row gap={SPACING.xs + 2}>
                <Icon name="sparkle" size={13} color={COLORS.surface} />
                <AppText variant="xsSemi" color={COLORS.surface}>Eigen-CAM</AppText>
              </Row>
            </View>
            {severityPercent !== null ? (
              <View style={[styles.glass, { backgroundColor: COLORS.severityModerate }]}>
                <AppText variant="xsSemi" color={COLORS.surface}>lesion {severityPercent}%</AppText>
              </View>
            ) : null}
          </Row>
        </View>
      </Section>

      <Section>
        <Card style={{ gap: SPACING.md - 4 }}>
          {result.stages.map((stage, i) => (
            <Col key={stage.stage} gap={SPACING.sm}>
              {i > 0 ? <Divider style={{ marginBottom: SPACING.sm - 4 }} /> : null}
              <Row justify="space-between">
                <AppText variant="xsSemi" color={COLORS.textSecondary}>{stage.caption}</AppText>
                <AppText variant="xsSemi" color={COLORS.textSecondary}>
                  {(stage.confidence / 100).toFixed(2)}
                </AppText>
              </Row>
              <Row justify="space-between">
                <Row gap={4}>
                  <AppText variant="lg">{stage.name}</AppText>
                  {stage.secondary ? (
                    <AppText variant="sm" color={COLORS.textSecondary}>{stage.secondary}</AppText>
                  ) : null}
                </Row>
                {stage.stage === 3 ? <StatusChip status={severityLabel} /> : null}
              </Row>
              <Meter value={stage.confidence} color={stage.color} />
            </Col>
          ))}
        </Card>
      </Section>

      <Section>
        <Card style={{ gap: SPACING.sm + 2 }}>
          <Row justify="space-between">
            <AppText variant="mdSemi">Severity</AppText>
            <AppText variant="smSemi" color={SEVERITY_COLOR[severityLabel]}>
              {SEVERITY_LABEL[severityLabel]}
              {severityPercent !== null ? ` · ${severityPercent}%` : ''}
            </AppText>
          </Row>
          {severityPercent !== null ? (
            <SeverityScale percent={severityPercent} />
          ) : (
            <AppText variant="sm" color={COLORS.textSecondary}>
              No fruit bounding box was produced, so severity is not computed.
            </AppText>
          )}
          <AppText variant="xs" color={COLORS.textSecondary}>
            Lesion area ÷ fruit bounding-box area, so severity does not change with camera distance.
          </AppText>
        </Card>
      </Section>

      {remedy ? (
        <Section>
          <Card style={{ gap: SPACING.sm + 2 }}>
            <Row justify="space-between">
              <AppText variant="mdSemi">Recommended remedy</AppText>
              {!remedy.verified ? <Chip label="Unverified" icon="warning" tone="warning" /> : null}
            </Row>
            <Col gap={SPACING.sm}>
              {[
                ['TREATMENT', remedy.treatment],
                ['TIMING', remedy.timing],
                ['PREVENTION', remedy.prevention],
              ].map(([label, body]) => (
                <Col key={label} gap={2}>
                  <AppText variant="xsSemi" color={COLORS.textSecondary}>{label}</AppText>
                  <AppText variant="sm">{body}</AppText>
                </Col>
              ))}
            </Col>
            {!remedy.verified ? (
              <Tile style={{ backgroundColor: '#fdf1e3' }}>
                <Row gap={SPACING.sm} align="flex-start">
                  <Icon name="info" size={16} color="#8a4b00" />
                  <AppText variant="xs" color="#8a4b00" style={{ flex: 1 }}>
                    Dosages are withheld until the project agriculturist supplies a citation. The
                    compiler flags this row as source: unverified.
                  </AppText>
                </Row>
              </Tile>
            ) : null}
          </Card>
        </Section>
      ) : null}

      <Section gap={SPACING.sm}>
        <Button label="Start 10-day monitoring" icon="calendar" onPress={onStartMonitoring} />
        <Button label="Ask the assistant about this" icon="chat" variant="secondary" onPress={onAskAssistant} />
        <AppText variant="xs" color={COLORS.textLight} center style={{ paddingTop: SPACING.xs }}>
          {result.savedLabel}
        </AppText>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  photo: {
    height: 190,
    borderRadius: RADIUS.md,
    backgroundColor: '#171d1a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  subject: { fontSize: 82 },
  bbox: {
    position: 'absolute',
    width: 132,
    height: 120,
    borderWidth: 2,
    borderColor: COLORS.accentLight,
    borderRadius: 4,
  },
  bboxLabel: {
    position: 'absolute',
    top: -19,
    left: -2,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  overlay: { position: 'absolute', top: 10, left: 10, right: 10 },
  glass: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
});
