import React from 'react';
import { AppText, Card, Col, COLORS, EmojiBadge, Icon, PressableRow, Row, SPACING, StatusChip } from '../../ui';
import type { ScanSummary } from '../viewModels';

export function ScanRow({ scan, onPress }: { scan: ScanSummary; onPress?: () => void }) {
  return (
    <PressableRow onPress={onPress}>
      <Card>
        <Row gap={SPACING.md - 4}>
          <EmojiBadge emoji={scan.emoji} size={44} square />
          <Col gap={SPACING.xs + 2} style={{ flex: 1 }}>
            <AppText variant="mdSemi">{scan.title}</AppText>
            <Row gap={SPACING.xs + 2}>
              <StatusChip status={scan.status} />
              <AppText variant="sm" color={COLORS.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                {scan.detail}
              </AppText>
            </Row>
          </Col>
          <Col gap={SPACING.xs + 2} align="flex-end">
            <AppText variant="xs" color={COLORS.textLight}>
              {scan.timeLabel}
            </AppText>
            <Icon name="chevronRight" size={18} color={COLORS.textLight} />
          </Col>
        </Row>
      </Card>
    </PressableRow>
  );
}
