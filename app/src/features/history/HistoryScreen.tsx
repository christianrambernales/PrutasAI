import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  AppText, Chip, Col, COLORS, Icon, PressableRow, RADIUS, Row, Section, SPACING, useT,
} from '../../ui';
import type { ScanGroup } from '../viewModels';
import { ScanRow } from '../components/ScanRow';

export interface HistoryFilter {
  /** Stable across languages; the label is what changes. */
  key: string;
  label: string;
}

export interface HistoryScreenProps {
  groups: ScanGroup[];
  filters: HistoryFilter[];
  activeFilterKey: string;
  totalLabel: string;
  /** null when the search field is closed. */
  query: string | null;
  onChangeQuery: (query: string) => void;
  onFilter: (key: string) => void;
  onOpenScan: (id: string) => void;
}

export function HistoryScreen(props: HistoryScreenProps) {
  const { groups, filters, activeFilterKey, totalLabel, query } = props;
  const t = useT();
  const empty = groups.every(g => g.scans.length === 0);
  const filtered = query !== null && query !== '' ? true : activeFilterKey !== filters[0]?.key;

  return (
    <>
      {query !== null ? (
        <Section>
          <View style={styles.search}>
            <Icon name="search" size={16} color={COLORS.textLight} />
            <TextInput
              style={styles.field}
              value={query}
              onChangeText={props.onChangeQuery}
              placeholder={t.searchScans}
              placeholderTextColor={COLORS.textLight}
              accessibilityLabel={t.searchScans}
              autoFocus
            />
          </View>
        </Section>
      ) : null}

      <Section>
        <Row gap={SPACING.xs + 2} wrap>
          {filters.map(f => (
            <PressableRow
              key={f.key}
              accessibilityLabel={f.label}
              selected={f.key === activeFilterKey}
              onPress={() => props.onFilter(f.key)}
            >
              <Chip label={f.label} tone={f.key === activeFilterKey ? 'selected' : 'outline'} />
            </PressableRow>
          ))}
        </Row>
      </Section>

      {empty ? (
        <Section>
          <Col gap={SPACING.sm} align="center" style={{ paddingVertical: SPACING.xxl }}>
            <AppText variant="mdSemi" color={COLORS.textSecondary}>
              {filtered ? t.noScansMatch : t.noScansYet}
            </AppText>
            <AppText variant="sm" color={COLORS.textLight} center>
              {filtered ? t.noScansMatchBlurb : t.noScansYetBlurb}
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
                  {t.scanWord(group.scans.length)}
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

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md - 4,
    paddingVertical: 10,
  },
  field: { flex: 1, color: COLORS.text, fontSize: 14, padding: 0 },
});
