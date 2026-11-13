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
  SPACING,
  StatusBadge,
  useLanguage,
  useT,
} from '../../ui';
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

export type SessionItem = MonitoringSessionItem;

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

const DEFAULT_SESSIONS: SessionItem[] = [
  {
    id: 'MON-042',
    crop: 'mango',
    title: 'Mangga Carabao #042',
    issue: 'Anthracnose',
    startDateFil: 'Okt 3, 2026',
    startDateEn: 'Oct 3, 2026',
    status: 'active',
    statusLabelFil: 'Aktibong Pagsusubaybay',
    statusLabelEn: 'Active Monitoring',
  },
  {
    id: 'MON-038',
    crop: 'banana',
    title: 'Saging Lakatan Puno #12',
    issue: 'Sigatoka Suspect',
    startDateFil: 'Set 22, 2026',
    startDateEn: 'Sep 22, 2026',
    status: 'completed',
    statusLabelFil: 'Tapos Na ang 10 Araw',
    statusLabelEn: '10-Day Complete',
  },
];

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

  const filterOptions: Array<{ key: MonitoringFilter; label: string }> = [
    { key: 'all', label: isFil ? 'Lahat (All)' : 'All' },
    { key: 'active', label: isFil ? 'Aktibo' : 'Active' },
    { key: 'completed', label: isFil ? 'Tapos Na' : 'Completed' },
  ];

  const mappedRows: SessionItem[] | null =
    props.rows && props.rows.length > 0
      ? props.rows.map(row => {
          const allDone = row.checkpoints.every(c => Boolean(c.completedDate));
          return {
            id: row.sourceScanId,
            crop: row.source.fruitKey === 'banana' ? 'banana' : 'mango',
            title: row.source.title,
            issue: row.source.detail || 'Observation',
            startDateFil: row.source.timeLabel,
            startDateEn: row.source.timeLabel,
            status: allDone ? 'completed' : 'active',
            statusLabelFil: allDone ? 'Tapos Na ang 10 Araw' : 'Aktibong Pagsusubaybay',
            statusLabelEn: allDone ? '10-Day Complete' : 'Active Monitoring',
          };
        })
      : null;
  const sessionItems = props.sessions ?? mappedRows ?? DEFAULT_SESSIONS;

  const filteredSessions = sessionItems.filter(sess => {
    if (activeFilter === 'active') return sess.status === 'active';
    if (activeFilter === 'completed') return sess.status === 'completed';
    return true;
  });

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

      {/* 5. Sessions List */}
      {filteredSessions.map(sess => {
        const isItemActive = sess.status === 'active';
        const badgeVariant = isItemActive ? 'warning' : 'healthy';
        const badgeLabel = isItemActive
          ? (isFil ? (sess.statusLabelFil ?? 'Aktibong Pagsusubaybay') : (sess.statusLabelEn ?? 'Active Monitoring'))
          : (isFil ? (sess.statusLabelFil ?? 'Tapos Na ang 10 Araw') : (sess.statusLabelEn ?? '10-Day Complete'));
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
      })}

      {/* 6. Bottom Action CTA */}
      <View style={styles.bottomActions}>
        <BtnForestFull
          label={isFil ? 'Mag-log ng Bagong Pananim mula sa Litrato' : 'Start from New Photo'}
          icon={<Icon name="camera" size={20} color="#ffffff" />}
          onPress={props.onScan ?? props.onNewSession}
          accessibilityLabel={t.monitoringListNewPhoto}
        />
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
  bottomActions: {
    marginTop: 6,
    gap: 8,
  },
});
