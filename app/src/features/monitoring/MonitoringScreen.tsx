import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText, Button, Card, Chip, Col, COLORS, Divider, EmojiBadge, Icon, PressableRow, RADIUS,
  Row, Section, SectionHeader, SEVERITY_COLOR, SPACING, StatusChip,
} from '../../ui';
import type { MonitoringSession } from '../viewModels';

export interface MonitoringScreenProps {
  session: MonitoringSession;
  onScanCheckpoint: () => void;
  onOpenCheckpoint: (day: number) => void;
}

const PROGRESS_COLOR = {
  improving: COLORS.improving,
  worsening: COLORS.worsening,
  stable: COLORS.stable,
} as const;

export function MonitoringScreen({ session, onScanCheckpoint, onOpenCheckpoint }: MonitoringScreenProps) {
  const maxPercent = Math.max(...session.checkpoints.map(c => c.percent ?? 0), 1);

  return (
    <>
      <Section>
        <Card style={{ gap: SPACING.md - 4 }}>
          <Row gap={SPACING.md - 4}>
            <EmojiBadge emoji={session.emoji} size={44} square />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="mdSemi">{session.title}</AppText>
              <AppText variant="sm" color={COLORS.textSecondary}>{session.subtitle}</AppText>
            </Col>
          </Row>
          <Divider />
          <Row gap={SPACING.sm}>
            <Icon name="trendingDown" size={18} color={PROGRESS_COLOR[session.progress]} />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="mdSemi" color={PROGRESS_COLOR[session.progress]}>
                {session.progress[0].toUpperCase() + session.progress.slice(1)}
              </AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>{session.progressDetail}</AppText>
            </Col>
          </Row>
        </Card>
      </Section>

      <Section>
        <Card style={{ gap: SPACING.sm + 2 }}>
          <Row justify="space-between">
            <AppText variant="mdSemi">Severity trend</AppText>
            <AppText variant="xs" color={COLORS.textLight}>lesion ÷ fruit area</AppText>
          </Row>
          <Row gap={SPACING.sm + 2} align="flex-end" style={{ height: 92 }}>
            {session.checkpoints.map(cp => (
              <Col key={cp.day} gap={SPACING.xs} align="center" justify="flex-end" style={{ flex: 1, height: '100%' }}>
                <AppText variant="xsSemi" color={cp.percent === null ? COLORS.textLight : COLORS.text}>
                  {cp.percent === null ? '—' : `${cp.percent}%`}
                </AppText>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(10, ((cp.percent ?? 0) / maxPercent) * 68)}%`,
                      backgroundColor: cp.status ? SEVERITY_COLOR[cp.status] : COLORS.surfaceAlt,
                    },
                  ]}
                />
                <AppText variant="xs" color={COLORS.textSecondary}>Day {cp.day}</AppText>
              </Col>
            ))}
          </Row>
        </Card>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title="Checkpoints" />
        <Col>
          {session.checkpoints.map((cp, i) => {
            const last = i === session.checkpoints.length - 1;
            return (
              <Row key={cp.day} gap={SPACING.md - 4} align="stretch">
                <Col align="center" style={{ width: 22 }}>
                  <View style={[styles.dot, !cp.done && styles.dotNext]} />
                  {!last ? <View style={styles.line} /> : null}
                </Col>
                <Col gap={SPACING.sm} style={{ flex: 1, paddingBottom: SPACING.md }}>
                  <Row justify="space-between">
                    <AppText variant="mdSemi" color={cp.done ? COLORS.text : COLORS.textSecondary}>
                      Day {cp.day} · {cp.dateLabel}
                    </AppText>
                    {cp.status ? <StatusChip status={cp.status} /> : <Chip label={cp.note} tone="outline" />}
                  </Row>
                  {cp.done ? (
                    <PressableRow onPress={() => onOpenCheckpoint(cp.day)}>
                      <Card style={{ padding: SPACING.sm + 2 }}>
                        <Row gap={SPACING.sm + 2}>
                          <EmojiBadge emoji={session.emoji} size={36} square />
                          <Col gap={2} style={{ flex: 1 }}>
                            <AppText variant="smSemi">{cp.percent}% of fruit area</AppText>
                            <AppText
                              variant="xs"
                              color={cp.day === 0 ? COLORS.textSecondary : COLORS.improving}
                            >
                              {cp.note}
                            </AppText>
                          </Col>
                          <Icon name="chevronRight" size={16} color={COLORS.textLight} />
                        </Row>
                      </Card>
                    </PressableRow>
                  ) : (
                    <Button label="Scan checkpoint" icon="camera" onPress={onScanCheckpoint} />
                  )}
                </Col>
              </Row>
            );
          })}
        </Col>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { width: '100%', borderRadius: 4 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    marginTop: 3,
  },
  dotNext: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.textLight,
    borderStyle: 'dashed',
  },
  line: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 4 },
});
