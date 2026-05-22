import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, FRUIT_EMOJI } from '../utils/theme';

const STATUS_COLORS = {
  improving: COLORS.improving,
  worsening: COLORS.worsening,
  stable: COLORS.stable,
  new_disease_found: COLORS.newDisease,
  resolved: COLORS.resolved,
};

const DAY_LABELS = { 1: 'day1', 5: 'day5', 10: 'day10' };

export default function RecoveryScreen({ navigation }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const result = await api.getRecoverySessions(token);
      setSessions(result.sessions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderSession = ({ item }) => (
    <TouchableOpacity style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.fruitEmoji}>{FRUIT_EMOJI[item.fruitType] || '🍎'}</Text>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionFruit}>{item.fruitType?.replace('_', ' ')}</Text>
          <Text style={styles.sessionDisease}>{item.disease?.replace('_', ' ')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.progressStatus] || COLORS.stable }]}>
          <Text style={styles.statusText}>{t(item.progressStatus?.replace('_', ''))}</Text>
        </View>
      </View>

      {/* Day 1/5/10 Timeline */}
      <View style={styles.timeline}>
        {[1, 5, 10].map((day, idx) => {
          const checkpoint = item.checkpoints?.find(cp => cp.day === day);
          const completed = !!checkpoint;
          return (
            <View key={day} style={styles.timelineItem}>
              {idx > 0 && (
                <View style={[styles.timelineLine, completed && styles.timelineLineActive]} />
              )}
              <View style={[styles.timelineDot, completed && styles.timelineDotActive]}>
                <Text style={styles.timelineDotText}>{completed ? '✓' : day}</Text>
              </View>
              <Text style={[styles.timelineLabel, completed && styles.timelineLabelActive]}>
                {t(DAY_LABELS[day])}
              </Text>
              {checkpoint && (
                <Text style={styles.timelineSeverity}>{t(checkpoint.severity)}</Text>
              )}
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('recoveryProgress')}</Text>
      <FlatList
        data={sessions}
        keyExtractor={item => item._id}
        renderItem={renderSession}
        refreshing={loading}
        onRefresh={loadSessions}
        ListEmptyComponent={
          !loading && <Text style={styles.empty}>{t('noRecovery')}</Text>
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
  sessionCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  fruitEmoji: { fontSize: 36 },
  sessionInfo: { flex: 1 },
  sessionFruit: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  sessionDisease: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  statusText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.xs, textTransform: 'capitalize' },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  timelineItem: { alignItems: 'center', flex: 1 },
  timelineLine: {
    position: 'absolute', top: 16, left: -50, right: 50,
    height: 2, backgroundColor: COLORS.border, width: '100%',
  },
  timelineLineActive: { backgroundColor: COLORS.primary },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  timelineDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timelineDotText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary },
  timelineLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: SPACING.xs, textAlign: 'center' },
  timelineLabelActive: { color: COLORS.text, fontWeight: '600' },
  timelineSeverity: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: FONTS.sizes.md, marginTop: SPACING.xxl },
});
