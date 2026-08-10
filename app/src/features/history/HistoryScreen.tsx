import React from 'react';
import { AppText, Chip, Col, COLORS, PressableRow, Row, Section, SPACING } from '../../ui';
import type { ScanGroup } from '../viewModels';
import { ScanRow } from '../components/ScanRow';

export interface HistoryScreenProps {
  groups: ScanGroup[];
  filters: string[];
  activeFilter: string;
  totalLabel: string;
  onFilter: (filter: string) => void;
  onOpenScan: (id: string) => void;
}

export function HistoryScreen(props: HistoryScreenProps) {
  const { groups, filters, activeFilter, totalLabel } = props;
  const empty = groups.every(g => g.scans.length === 0);

  return (
    <>
      <Section>
        <Row gap={SPACING.xs + 2} wrap>
          {filters.map(f => (
            <PressableRow key={f} onPress={() => props.onFilter(f)}>
              <Chip label={f} tone={f === activeFilter ? 'selected' : 'outline'} />
            </PressableRow>
          ))}
        </Row>
      </Section>

      {empty ? (
        <Section>
          <Col gap={SPACING.sm} align="center" style={{ paddingVertical: SPACING.xxl }}>
            <AppText variant="mdSemi" color={COLORS.textSecondary}>No scans yet</AppText>
            <AppText variant="sm" color={COLORS.textLight} center>
              Scans you take are stored on this device and never uploaded.
            </AppText>
          </Col>
        </Section>
      ) : (
        groups
          .filter(group => group.scans.length > 0)
          .map(group => (
            <Section key={group.label} gap={SPACING.sm + 2}>
              <Row justify="space-between" align="baseline">
                <AppText variant="smSemi" color={COLORS.textSecondary}>{group.label}</AppText>
                <AppText variant="xs" color={COLORS.textLight}>
                  {group.scans.length} {group.scans.length === 1 ? 'scan' : 'scans'}
                </AppText>
              </Row>
              <Col gap={SPACING.sm}>
                {group.scans.map(scan => (
                  <ScanRow key={scan.id} scan={scan} onPress={() => props.onOpenScan(scan.id)} />
                ))}
              </Col>
            </Section>
          ))
      )}

      {!empty ? (
        <AppText variant="xs" color={COLORS.textLight} center style={{ paddingBottom: SPACING.md }}>
          {totalLabel}
        </AppText>
      ) : null}
    </>
  );
}
