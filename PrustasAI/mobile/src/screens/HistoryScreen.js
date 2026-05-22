import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, FRUIT_EMOJI } from '../utils/theme';

export default function HistoryScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadScans = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      setLoading(true);
      const result = await api.getHistory(token, pageNum);
      if (refresh) {
        setScans(result.scans);
      } else {
        setScans(prev => [...prev, ...result.scans]);
      }
      setHasMore(pageNum < result.pagination.pages);
      setPage(pageNum);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadScans(1, true); }, []);

  const renderScan = ({ item }) => (
    <TouchableOpacity
      style={styles.scanCard}
      onPress={() => navigation.navigate('Result', { scan: item })}
    >
      <Text style={styles.fruitEmoji}>{FRUIT_EMOJI[item.fruitType] || '🍎'}</Text>
      <View style={styles.scanInfo}>
        <Text style={styles.scanFruit}>{item.fruitType?.replace('_', ' ')}</Text>
        <Text style={styles.scanDisease}>
          {item.isHealthy ? `✅ ${t('healthy')}` : `⚠️ ${item.disease?.replace('_', ' ')}`}
        </Text>
        <Text style={styles.scanDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {!item.isHealthy && (
        <View style={[styles.severityDot, {
          backgroundColor: item.severity === 'early' ? COLORS.severityEarly
            : item.severity === 'moderate' ? COLORS.severityModerate
            : COLORS.severitySevere
        }]} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('history')}</Text>
      <FlatList
        data={scans}
        keyExtractor={item => item._id}
        renderItem={renderScan}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadScans(1, true)} />}
        onEndReached={() => hasMore && loadScans(page + 1)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && <Text style={styles.empty}>{t('noScans')}</Text>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: FONTS.sizes.title, fontWeight: '800', color: COLORS.text, padding: SPACING.lg, paddingBottom: SPACING.sm },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  scanCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    marginBottom: SPACING.sm, ...SHADOWS.sm,
  },
  fruitEmoji: { fontSize: 36 },
  scanInfo: { flex: 1 },
  scanFruit: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  scanDisease: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  scanDate: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 2 },
  severityDot: { width: 12, height: 12, borderRadius: 6 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: FONTS.sizes.md, marginTop: SPACING.xxl },
});
