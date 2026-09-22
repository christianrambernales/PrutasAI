import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText, Button, Card, Chip, Col, COLORS, Divider, EmojiBadge, Icon, PressableRow, RADIUS,
  Row, Section, SectionHeader, SPACING,
} from '../../ui';
import type { MonitoringView } from '../viewModels';

export interface MonitoringScreenProps {
  session: MonitoringView;
  /** Day of the checkpoint currently opened; there is no separate detail screen. */
  expandedCheckpointDay: number | null;
  onScanCheckpoint: () => void;
  onOpenCheckpoint: (day: number) => void;
}

export function MonitoringScreen({
  session,
  expandedCheckpointDay,
  onScanCheckpoint,
  onOpenCheckpoint,
}: MonitoringScreenProps) {
  return (
    <>
      <Section>
        <Card style={{ gap: SPACING.md - 4 }}>
          <Row gap={SPACING.md - 4}>
            <EmojiBadge emoji={session.emoji} size={44} square />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="mdSemi">{session.title}</AppText>
              <AppText variant="sm" color={COLORS.textSecondary}>Observation Timeline</AppText>
            </Col>
          </Row>
          <Divider />
          <Row gap={SPACING.sm}>
            <Icon name="info" size={18} color={COLORS.textSecondary} />
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="mdSemi" color={COLORS.textSecondary}>
                Overall trend unavailable
              </AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>
                Phase 4 does not compute automatic trend from observations yet.
              </AppText>
            </Col>
          </Row>
        </Card>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title="Checkpoints" />
        <Col>
          {session.checkpoints.map((cp, i) => {
            const last = i === session.checkpoints.length - 1;
            const done = cp.status === 'completed' || cp.status === 'completed_late';
            const dateLabel = new Date(cp.scheduledDate).toLocaleDateString();

            return (
              <Row key={cp.dayNumber} gap={SPACING.md - 4} align="stretch">
                <Col align="center" style={{ width: 22 }}>
                  <View style={[styles.dot, !done && styles.dotNext]} />
                  {!last ? <View style={styles.line} /> : null}
                </Col>
                <Col gap={SPACING.sm} style={{ flex: 1, paddingBottom: SPACING.md }}>
                  <Row justify="space-between">
                    <AppText variant="mdSemi" color={done ? COLORS.text : COLORS.textSecondary}>
                      Day {cp.dayNumber} · {dateLabel}
                    </AppText>
                    <Chip label={cp.status.replace('_', ' ').toUpperCase()} tone="outline" />
                  </Row>
                  
                  {cp.missingFields.length > 0 && (
                     <AppText variant="xs" color={COLORS.worsening}>
                        Missing: {cp.missingFields.join(', ')}
                     </AppText>
                  )}

                  {done ? (
                    <PressableRow
                      accessibilityLabel={`Day ${cp.dayNumber} checkpoint`}
                      selected={cp.dayNumber === expandedCheckpointDay}
                      onPress={() => onOpenCheckpoint(cp.dayNumber)}
                    >
                      <Card style={{ padding: SPACING.sm + 2, gap: SPACING.sm }}>
                        <Row gap={SPACING.sm + 2}>
                          <EmojiBadge emoji={session.emoji} size={36} square />
                          <Col gap={2} style={{ flex: 1 }}>
                            <AppText variant="smSemi">Observation: {cp.observation ?? 'None'}</AppText>
                            {cp.note && (
                              <AppText variant="xs" color={COLORS.textSecondary}>
                                {cp.note}
                              </AppText>
                            )}
                          </Col>
                          <Icon
                            name={cp.dayNumber === expandedCheckpointDay ? 'chevronDown' : 'chevronRight'}
                            size={16}
                            color={COLORS.textLight}
                          />
                        </Row>
                        {cp.dayNumber === expandedCheckpointDay ? (
                          <>
                            <Divider />
                            <Col gap={SPACING.xs + 2}>
                              <Row justify="space-between">
                                <AppText variant="xs" color={COLORS.textSecondary}>Completed</AppText>
                                <AppText variant="xsSemi">
                                  {cp.completedDate ? new Date(cp.completedDate).toLocaleDateString() : '—'}
                                </AppText>
                              </Row>
                            </Col>
                          </>
                        ) : null}
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
