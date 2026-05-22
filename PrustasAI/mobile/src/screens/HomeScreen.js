import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS, FRUIT_EMOJI } from '../utils/theme';

const FRUITS = [
  { id: 'mango', key: 'mango' },
  { id: 'banana', key: 'banana' },
  { id: 'papaya', key: 'papaya' },
  { id: 'capsicum', key: 'capsicum' },
  { id: 'orange', key: 'orange' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <Text style={styles.greeting}>
          {t('welcome')}, {user?.name?.split(' ')[0]}! 👋
        </Text>
        <Text style={styles.subtitle}>{t('tagline')}</Text>
      </View>

      {/* Scan Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Camera')}
      >
        <Text style={styles.scanIcon}>📸</Text>
        <View>
          <Text style={styles.scanTitle}>{t('scan')}</Text>
          <Text style={styles.scanSubtitle}>{t('takePhoto')}</Text>
        </View>
      </TouchableOpacity>

      {/* Supported Fruits */}
      <Text style={styles.sectionTitle}>{t('supportedFruits')}</Text>
      <View style={styles.fruitsGrid}>
        {FRUITS.map(fruit => (
          <TouchableOpacity
            key={fruit.id}
            style={styles.fruitCard}
            onPress={() => navigation.navigate('Camera', { fruitHint: fruit.id })}
          >
            <Text style={styles.fruitEmoji}>{FRUIT_EMOJI[fruit.id]}</Text>
            <Text style={styles.fruitName}>{t(fruit.key)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>{t('history')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Recovery')}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>{t('recovery')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  banner: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  greeting: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: FONTS.sizes.md, color: 'rgba(255,255,255,0.7)', marginTop: SPACING.xs },
  scanButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  scanIcon: { fontSize: 36 },
  scanTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: '#fff' },
  scanSubtitle: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.8)' },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  fruitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  fruitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    width: '30%',
    flexGrow: 1,
    ...SHADOWS.sm,
  },
  fruitEmoji: { fontSize: 32, marginBottom: SPACING.xs },
  fruitName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  quickActions: { flexDirection: 'row', gap: SPACING.md },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  actionIcon: { fontSize: 28, marginBottom: SPACING.xs },
  actionText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
});
