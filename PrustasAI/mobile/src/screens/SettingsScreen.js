import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../utils/theme';

export default function SettingsScreen() {
  const { user, logout, updateLanguage } = useAuth();
  const { language, switchLanguage, t } = useLanguage();

  const handleLanguageToggle = async (lang) => {
    switchLanguage(lang);
    try {
      await updateLanguage(lang);
    } catch (err) { /* ignore */ }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings')}</Text>

      {/* User Info */}
      <View style={styles.card}>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Language Setting */}
      <View style={styles.card}>
        <Text style={styles.settingLabel}>{t('language')}</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => handleLanguageToggle('en')}
          >
            <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
              🇺🇸 {t('english')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'fil' && styles.langBtnActive]}
            onPress={() => handleLanguageToggle('fil')}
          >
            <Text style={[styles.langText, language === 'fil' && styles.langTextActive]}>
              🇵🇭 {t('filipino')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  title: { fontSize: FONTS.sizes.title, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  userName: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs },
  settingLabel: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  langRow: { flexDirection: 'row', gap: SPACING.sm },
  langBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: COLORS.border, alignItems: 'center',
  },
  langBtnActive: { borderColor: COLORS.primary, backgroundColor: '#e8f5e9' },
  langText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  langTextActive: { color: COLORS.primary, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: COLORS.error, borderRadius: RADIUS.lg, padding: SPACING.lg,
    alignItems: 'center', marginTop: SPACING.lg,
  },
  logoutText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '700' },
});
