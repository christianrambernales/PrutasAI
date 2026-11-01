import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AppText,
  BtnSubtle,
  Button,
  Col,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  RADIUS,
  Row,
  Section,
  SEVERITY_LABEL,
  SPACING,
  StatusBadge,
  useLanguage,
  useT,
} from '../../ui';
import type { ScanGroup } from '../viewModels';

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
  /** Triggered when empty state offers to scan. */
  onScan?: () => void;
  /** Top cell Home action */
  onHome?: () => void;
  onBackHome?: () => void;
  /** True if currently fetching or syncing. */
  loading?: boolean;
  /** True if device is explicitly offline. */
  offline?: boolean;
  /** A read/sync error message. */
  error?: string | null;
  /** Triggered when the user presses Retry on an error banner. */
  onRetry?: () => void;
}

export function HistoryScreen(props: HistoryScreenProps) {
  const { groups, filters, activeFilterKey, totalLabel, query } = props;
  const language = useLanguage();
  const isFil = language === 'FIL';
  const t = useT();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const empty = groups.every(g => g.scans.length === 0);
  const filtered = query !== null && query !== '' ? true : activeFilterKey !== filters[0]?.key;

  return (
    <View style={styles.container}>
      {/* 1. GreenTopCell */}
      <GreenTopCell
        title={isFil ? 'Kasaysayan ng mga Scan' : 'Scan History'}
        subtitle={isFil ? 'Ligtas na naka-imbak sa SQLite database' : 'Persisted locally on device SQLite'}
        rightAction={
          <BtnSubtle
            label={`← ${isFil ? 'Home' : 'Home'}`}
            textColor="#ffffff"
            onPress={props.onBackHome ?? props.onHome}
            accessibilityLabel="Home"
          />
        }
      />

      {/* 2. Search Field */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={query ?? ''}
            onChangeText={props.onChangeQuery}
            placeholder={isFil ? 'Maghanap ng prutas, sakit, o ID...' : 'Search scans, fruits, diseases, IDs...'}
            placeholderTextColor="#9ca3af"
            accessibilityLabel={t.searchScans}
            accessibilityRole="search"
          />
        </View>
      </View>

      {/* 3. Filter Chips */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map(f => {
            const isSelected = f.key === activeFilterKey;
            const emoji = f.key.toLowerCase().includes('mango') ? '🥭 '
              : f.key.toLowerCase().includes('banana') ? '🍌 '
              : f.key.toLowerCase().includes('papaya') ? '🍈 '
              : '';
            const displayLabel = f.label.startsWith('🥭') || f.label.startsWith('🍌') || f.label.startsWith('🍈')
              ? f.label
              : `${emoji}${f.label}`;

            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityLabel={f.label}
                onPress={() => props.onFilter(f.key)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={[
                  styles.filterChip,
                  isSelected ? styles.filterChipSelected : styles.filterChipDefault,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected ? styles.filterChipTextSelected : styles.filterChipTextDefault,
                  ]}
                >
                  {displayLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Error banner */}
      {props.error ? (
        <Section>
          <Col gap={SPACING.sm} style={styles.errorBox}>
            <Row gap={SPACING.sm} align="center">
              <Icon name="warning" size={20} color={COLORS.accent} />
              <AppText
                variant="smSemi"
                color={COLORS.text}
                style={{ flex: 1 }}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {t.historyReadError}
              </AppText>
            </Row>
            {props.onRetry && (
              <Row justify="flex-end">
                <Button label={t.retry} variant="secondary" onPress={props.onRetry} />
              </Row>
            )}
          </Col>
        </Section>
      ) : props.offline ? (
        <Section>
          <Row gap={SPACING.sm} align="center" justify="center" style={{ paddingBottom: SPACING.sm }}>
            <Icon name="wifiOff" size={16} color={COLORS.textLight} />
            <AppText
              variant="xs"
              color={COLORS.textSecondary}
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
            >
              {t.offlineSavedLocally}
            </AppText>
          </Row>
        </Section>
      ) : props.loading ? (
        <Section>
          <AppText
            variant="xs"
            color={COLORS.textSecondary}
            center
            style={{ paddingBottom: SPACING.sm }}
            accessibilityRole="progressbar"
            accessibilityLabel={t.historyLoading}
            accessibilityState={{ busy: true }}
            accessibilityLiveRegion="polite"
          >
            {t.historyLoading}
          </AppText>
        </Section>
      ) : null}

      {/* 5. Records or Empty State */}
      {empty ? (
        <Section>
          <Col gap={SPACING.sm} align="center" style={{ paddingVertical: SPACING.xxl }}>
            <AppText variant="mdSemi" color={COLORS.textSecondary}>
              {filtered ? t.noScansMatch : t.noScansYet}
            </AppText>
            <AppText variant="sm" color={COLORS.textSecondary} center>
              {filtered ? t.noScansMatchBlurb : t.noScansYetBlurb}
            </AppText>
            {!filtered && props.onScan ? (
              <View style={{ marginTop: SPACING.md }}>
                <Button label={t.homeActionScan} icon="camera" onPress={props.onScan} />
              </View>
            ) : null}
          </Col>
        </Section>
      ) : (
        groups
          .filter(group => group.scans.length > 0)
          .map(group => (
            <View key={group.label} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <Text style={styles.groupCount}>{t.scanWord(group.scans.length)}</Text>
              </View>
              <View style={styles.recordsList}>
                {group.scans.map(scan => (
                  <FrostedCard
                    key={scan.id}
                    onPress={() => props.onOpenScan(scan.id)}
                    accessibilityRole="button"
                    accessibilityLabel={scan.title}
                    style={styles.recordCard}
                  >
                    <View style={styles.cardContent}>
                      {scan.imageUri && !imageErrors[scan.id] ? (
                        <Image
                          source={{ uri: scan.imageUri }}
                          style={styles.avatarImage}
                          testID={`scan-photo-${scan.id}`}
                          onError={() => setImageErrors(prev => ({ ...prev, [scan.id]: true }))}
                        />
                      ) : imageErrors[scan.id] ? (
                        <View style={[styles.avatarCrop, styles.errorAvatar]}>
                          <AppText variant="xs" color={COLORS.textSecondary} center numberOfLines={2}>
                            {t.localPhotoUnavailable}
                          </AppText>
                        </View>
                      ) : (
                        <View style={styles.avatarCrop}>
                          <Text style={styles.avatarCropEmoji}>
                            {scan.emoji || (scan.fruitKey === 'mango' ? '🥭' : scan.fruitKey === 'banana' ? '🍌' : scan.fruitKey === 'papaya' ? '🍈' : '🌱')}
                          </Text>
                        </View>
                      )}
                      <View style={styles.cardDetails}>
                        <View style={styles.cardTopRow}>
                          <Text style={styles.cropTitle} numberOfLines={1}>{scan.title}</Text>
                          <StatusBadge variant="offline" label={isFil ? 'Lokal' : 'Local'} />
                        </View>
                        <View style={styles.cardFindingRow}>
                          <Text style={styles.findingText} numberOfLines={1}>{scan.detail}</Text>
                          {scan.status === 'undetermined' ? (
                            <StatusBadge
                              variant="offline"
                              label={t.resultNotAnalyzed}
                              style={{ paddingVertical: 1, paddingHorizontal: 6 }}
                              textStyle={{ fontSize: 10 }}
                            />
                          ) : scan.status ? (
                            <StatusBadge
                              variant="healthy"
                              label={SEVERITY_LABEL[scan.status]}
                              style={{ paddingVertical: 1, paddingHorizontal: 6 }}
                              textStyle={{ fontSize: 10 }}
                            />
                          ) : null}
                        </View>
                        <Text style={styles.recordMeta} numberOfLines={1}>
                          {scan.id} • {scan.timeLabel}
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#9ca3af" />
                    </View>
                  </FrostedCard>
                ))}
              </View>
            </View>
          ))
      )}

      {!empty && totalLabel ? (
        <Text style={styles.totalLabel}>{totalLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  searchSection: {
    paddingHorizontal: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(21, 77, 46, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#6b7280',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1f2937',
    paddingVertical: 10,
    fontFamily: FONTS.regular,
  },
  filtersSection: {
    paddingVertical: 2,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipDefault: {
    backgroundColor: '#e2e8f0',
  },
  filterChipSelected: {
    backgroundColor: '#154d2e',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  filterChipTextDefault: {
    color: '#334155',
  },
  filterChipTextSelected: {
    color: '#ffffff',
  },
  errorBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  groupSection: {
    gap: 8,
    marginTop: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  groupCount: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#9ca3af',
  },
  recordsList: {
    gap: 8,
  },
  recordCard: {
    padding: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eaf4ed',
    flexShrink: 0,
  },
  avatarCrop: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eaf4ed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  errorAvatar: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 2,
  },
  avatarCropEmoji: {
    fontSize: 22,
    textAlign: 'center',
  },
  cardDetails: {
    flex: 1,
    minWidth: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cropTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#154d2e',
    flex: 1,
    marginRight: 6,
  },
  cardFindingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  findingText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#1f2937',
    flexShrink: 1,
  },
  recordMeta: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#6b7280',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
