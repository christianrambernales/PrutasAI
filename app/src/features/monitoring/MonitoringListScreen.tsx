import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  AppText,
  BtnForestFull,
  BtnOutline,
  BtnSubtle,
  CropCircleAvatar,
  CropType,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  RADIUS,
  SPACING,
  StatusBadge,
  useLanguage,
  useT,
} from '../../ui';
import { Chip } from '../../ui/components/controls';
import { localizeStoredScan } from '../history/localizeScan';
import type { MonitoringListRow } from './useMonitoringList';

export interface MonitoringSessionItem {
  id: string;
  title: string;
  crop?: CropType;
  emoji?: string;
  status: 'active' | 'completed' | string;
  issue: string;
  startDate?: string;
  statusLabelFil?: string;
  statusLabelEn?: string;
  startDateFil?: string;
  startDateEn?: string;
}

export type MonitoringFilter = 'all' | 'active' | 'completed';

export interface MonitoringListScreenProps {
  rows?: MonitoringListRow[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onOpen?: (sourceScanId: string) => void;
  onScan?: () => void;
  onOpenHistory?: () => void;

  sessions?: MonitoringSessionItem[];
  activeFilter?: MonitoringFilter;
  onSelectFilter?: (filter: MonitoringFilter) => void;
  onSelectSession?: (sessionId: string) => void;
  onNewSession?: () => void;
  style?: StyleProp<ViewStyle>;
}

function finished(row: MonitoringListRow): boolean {
  return row.checkpoints.length > 0 && row.checkpoints.every(checkpoint => checkpoint.completedDate !== null);
}

/**
 * 1:1 Prototype Implementation of Screen 5: Monitoring Sessions List (monitoringList.html)
 * Displays GreenTopCell header, filter bar (All, Active, Completed), FrostedCard session items,
 * and bottom CTA to start from a new photo.
 */
export function MonitoringListScreen(props: MonitoringListScreenProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';

  const [internalFilter, setInternalFilter] = useState<MonitoringFilter>('all');
  const activeFilter = props.activeFilter ?? internalFilter;

  const handleSelectFilter = (filter: MonitoringFilter) => {
    setInternalFilter(filter);
    props.onSelectFilter?.(filter);
  };

  const dateLabel = (value: number | string | undefined) => {
    const date = value === undefined ? null : new Date(value);
    return date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString(isFil ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : t.monitoringListDateUnavailable;
  };

  const filterOptions: Array<{ key: MonitoringFilter; label: string }> = [
    { key: 'all', label: isFil ? 'Lahat (All)' : 'All' },
    { key: 'active', label: isFil ? 'Aktibo' : 'Active' },
    { key: 'completed', label: isFil ? 'Tapos Na' : 'Completed' },
  ];

  const hasSessions = Boolean(props.sessions && props.sessions.length > 0);
  const rows = props.rows ?? [];
  const hasRows = rows.length > 0;
  const isEmpty = !props.loading && !props.error && !hasSessions && !hasRows;

  // Filtered session items (when props.sessions is provided)
  const filteredSessions = (props.sessions ?? []).filter(sess => {
    if (activeFilter === 'active') return sess.status === 'active';
    if (activeFilter === 'completed') return sess.status === 'completed';
    return true;
  });

  // Filtered rows by group (when props.rows is provided)
  const pendingRows = rows.filter(row => !finished(row));
  const completeRows = rows.filter(finished);

  const groups = [
    {
      title: t.monitoringListPending,
      rows: pendingRows,
      show: activeFilter === 'all' || activeFilter === 'active',
    },
    {
      title: t.monitoringListComplete,
      rows: completeRows,
      show: activeFilter === 'all' || activeFilter === 'completed',
    },
  ];

  return (
    <View style={[styles.container, props.style]}>
      {/* 1. Green Top Cell Header */}
      <GreenTopCell
        title={isFil ? 'Mga Pagsubaybay (Monitoring)' : 'Crop Monitoring'}
        subtitle={isFil ? 'Subaybayan ang pagbabago sa loob ng 10 araw' : 'Track crop condition across Day 1, 5, and 10'}
        rightAction={
          <BtnSubtle
            label={isFil ? '+ Bago' : '+ New'}
            textColor="#ffffff"
            onPress={props.onNewSession ?? props.onScan}
            style={styles.newPillButton}
            accessibilityLabel={isFil ? '+ Bago' : '+ New'}
          />
        }
      />

      {/* 2. Filter Bar */}
      <View style={styles.filterBar}>
        {filterOptions.map(f => {
          const isSelected = activeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityLabel={f.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleSelectFilter(f.key)}
              style={[
                styles.filterChip,
                isSelected ? styles.filterChipSelected : styles.filterChipUnselected,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected ? styles.filterChipTextSelected : styles.filterChipTextUnselected,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3. Loading State */}
      {props.loading ? (
        <View style={styles.stateContainer}>
          <AppText accessibilityLiveRegion="polite" color="#64748b">
            {t.monitoringListLoading}
          </AppText>
        </View>
      ) : null}

      {/* 4. Error State */}
      {props.error ? (
        <FrostedCard style={styles.cardSpacing}>
          <View style={{ gap: SPACING.md }}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' }}>
              <Icon name="warning" color="#b91c1c" />
              <AppText accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flex: 1 }}>
                {t.monitoringListError}
              </AppText>
            </View>
            <BtnOutline label={t.retry} onPress={props.onRetry} disabled={props.loading} />
          </View>
        </FrostedCard>
      ) : null}

      {/* 5. Empty State */}
      {isEmpty ? (
        <FrostedCard style={styles.emptyCard}>
          <View style={styles.emptyIconContainer}>
            <Icon name="monitoring" size={32} color="#154d2e" />
          </View>
          <AppText variant="lg" accessibilityRole="header" center>
            {t.monitoringListEmpty}
          </AppText>
          <AppText center color="#64748b">
            {t.monitoringListEmptyDetail}
          </AppText>
        </FrostedCard>
      ) : null}

      {/* 6A. Standalone Sessions List (props.sessions) */}
      {hasSessions
        ? filteredSessions.map(sess => {
            const isItemActive = sess.status === 'active';
            const badgeVariant = isItemActive ? 'warning' : 'healthy';
            const badgeLabel = isItemActive
              ? (isFil ? (sess.statusLabelFil ?? 'Aktibo') : (sess.statusLabelEn ?? 'Active'))
              : (isFil ? (sess.statusLabelFil ?? 'Tapos Na') : (sess.statusLabelEn ?? 'Completed'));
            const dateStr = isFil
              ? `Sinimulan: ${sess.startDateFil ?? sess.startDate ?? ''}`
              : `Started: ${sess.startDateEn ?? sess.startDate ?? ''}`;

            return (
              <FrostedCard
                key={sess.id}
                accessibilityRole="button"
                accessibilityLabel={sess.title}
                onPress={() => {
                  props.onSelectSession?.(sess.id);
                  props.onOpen?.(sess.id);
                }}
                style={styles.sessionCard}
              >
                <View style={styles.sessionCardInner}>
                  <CropCircleAvatar
                    crop={sess.crop}
                    emoji={sess.emoji}
                    size={44}
                    backgroundColor="#eaf4ed"
                    style={styles.cropAvatar}
                  />
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionHeaderRow}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {sess.title}
                      </Text>
                      <StatusBadge variant={badgeVariant} label={badgeLabel} />
                    </View>
                    <Text style={styles.sessionSubtitle} numberOfLines={1}>
                      {sess.issue} • {dateStr}
                    </Text>
                  </View>
                  <View style={styles.chevronContainer}>
                    <Icon name="chevronRight" size={18} color="#64748b" />
                  </View>
                </View>
              </FrostedCard>
            );
          })
        : null}

      {/* 6B. Real App Monitoring Rows (props.rows) */}
      {!hasSessions && hasRows
        ? groups.map(group =>
            group.show && group.rows.length > 0 ? (
              <View key={group.title} style={styles.groupSection}>
                <AppText variant="smSemi" color="#64748b" accessibilityRole="header">
                  {group.title}
                </AppText>
                {group.rows.map(row => {
                  const source = localizeStoredScan(row.source, language, t);
                  const completed = row.checkpoints.filter(cp => cp.completedDate !== null).length;
                  const isComplete = finished(row);
                  const badgeVariant = isComplete ? 'healthy' : 'warning';
                  const badgeLabel = isComplete
                    ? (isFil ? 'Tapos Na' : 'Completed')
                    : (isFil ? 'Aktibo' : 'Active');
                  const timeline = [
                    { id: 'baseline', label: t.monitoringDay1, date: source.createdAtIso, completed: true },
                    ...[...row.checkpoints]
                      .sort((a, b) => a.dayNumber - b.dayNumber)
                      .map(cp => ({
                        id: cp.id,
                        label: cp.dayNumber === 5 ? t.monitoringDay5 : t.monitoringDay10,
                        date: cp.completedDate ?? cp.scheduledDate,
                        completed: cp.completedDate !== null,
                      })),
                  ];

                  return (
                    <FrostedCard
                      key={row.id}
                      accessibilityRole="button"
                      accessibilityLabel={t.monitoringListOpen(source.title)}
                      onPress={() => props.onOpen?.(row.sourceScanId)}
                      style={styles.sessionCard}
                    >
                      <View style={styles.sessionCardInner}>
                        <CropCircleAvatar
                          emoji={source.emoji}
                          crop={source.fruitNameEn?.toLowerCase()}
                          size={44}
                          backgroundColor="#eaf4ed"
                          style={styles.cropAvatar}
                        />
                        <View style={styles.sessionInfo}>
                          <View style={styles.sessionHeaderRow}>
                            <Text style={styles.sessionTitle} numberOfLines={1}>
                              {source.title}
                            </Text>
                            <StatusBadge variant={badgeVariant} label={badgeLabel} />
                          </View>
                          <Text style={styles.sessionSubtitle} numberOfLines={1}>
                            {source.detail ? `${source.detail} • ` : ''}
                            {t.monitoringListStarted(dateLabel(source.createdAtIso))}
                          </Text>
                        </View>
                        <View style={styles.chevronContainer}>
                          <Icon name="chevronRight" size={18} color="#64748b" />
                        </View>
                      </View>

                      {/* Progress badge / chip */}
                      <View style={styles.progressRow}>
                        <Chip
                          label={t.monitoringListProgress(completed, row.checkpoints.length)}
                          tone="selected"
                        />
                      </View>

                      {/* Timeline Day Pills */}
                      <View style={styles.timelineChipsRow}>
                        {timeline.map(day => (
                          <View key={day.id} style={styles.dayChip}>
                            <View style={styles.dayChipHeader}>
                              <Icon
                                name={day.completed ? 'check' : 'calendar'}
                                size={14}
                                color="#154d2e"
                              />
                              <AppText variant="smSemi">{day.label}</AppText>
                            </View>
                            <AppText variant="xs" color="#64748b">
                              {day.completed ? t.monitoringCompleted : t.monitoringScheduled}
                            </AppText>
                            <AppText variant="xs" color="#64748b">
                              {dateLabel(day.date)}
                            </AppText>
                          </View>
                        ))}
                      </View>
                    </FrostedCard>
                  );
                })}
              </View>
            ) : null
          )
        : null}

      {/* 7. Bottom Action CTA */}
      <View style={styles.bottomActions}>
        <BtnForestFull
          label={isFil ? 'Mag-log ng Bagong Pananim mula sa Litrato' : 'Start from New Photo'}
          icon={<Icon name="camera" size={20} color="#ffffff" />}
          onPress={props.onScan ?? props.onNewSession}
          accessibilityLabel={t.monitoringListNewPhoto}
        />
        {props.onOpenHistory ? (
          <BtnOutline
            label={t.monitoringListHistory}
            icon={<Icon name="history" size={18} color="#154d2e" />}
            onPress={props.onOpenHistory}
            accessibilityLabel={t.monitoringListHistory}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f2f6f3',
    padding: 14,
    gap: 12,
  },
  newPillButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
  filterChip: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipSelected: {
    backgroundColor: '#154d2e',
  },
  filterChipUnselected: {
    backgroundColor: '#e2e8f0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  filterChipTextSelected: {
    color: '#ffffff',
  },
  filterChipTextUnselected: {
    color: '#334155',
  },
  stateContainer: {
    paddingVertical: 12,
  },
  cardSpacing: {
    padding: 14,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eaf4ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupSection: {
    gap: 10,
  },
  sessionCard: {
    padding: 12,
    gap: 10,
  },
  sessionCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cropAvatar: {
    borderRadius: 12,
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
  },
  sessionSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748b',
    marginTop: 2,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 24,
    minHeight: 48,
  },
  progressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timelineChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  dayChip: {
    flexGrow: 1,
    flexBasis: 90,
    backgroundColor: '#f1f5f9',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    gap: 2,
  },
  dayChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomActions: {
    marginTop: 6,
    gap: 8,
  },
});
