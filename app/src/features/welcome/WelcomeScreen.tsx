import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AppText,
  BtnForestFull,
  BtnSubtle,
  Button,
  Col,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Row,
  SPACING,
  useLanguage,
  useT,
} from '../../ui';
import { strings, type Language } from '../../ui/i18n/strings';

export interface WelcomeScreenProps {
  currentLanguage?: Language;
  onChooseAccount?: () => void | Promise<void>;
  onChooseOffline?: () => void | Promise<void>;
  onCreateAccount?: () => void | Promise<void>;
  onContinueOffline?: () => void | Promise<void>;
  onSignIn?: () => void | Promise<void>;
  onLogin?: () => void | Promise<void>;
  onSelectLanguage?: (lang: Language) => void;
}

export function WelcomeScreen(props: WelcomeScreenProps) {
  const {
    currentLanguage,
    onChooseAccount,
    onChooseOffline,
    onCreateAccount,
    onContinueOffline,
    onSignIn,
    onLogin,
    onSelectLanguage,
  } = props;

  const hookT = useT();
  const hookLang = useLanguage();
  const activeLang = currentLanguage ?? hookLang;
  const t = currentLanguage ? strings(currentLanguage) : hookT;
  const isFil = activeLang === 'FIL';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [choice, setChoice] = useState<'account' | 'offline' | null>(null);

  const handleOffline = onContinueOffline ?? onChooseOffline;
  const handleAccount = onCreateAccount ?? onChooseAccount;

  const handleSubmit = async () => {
    if (!choice || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (choice === 'account') {
        if (handleAccount) await handleAccount();
      } else {
        if (handleOffline) await handleOffline();
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async () => {
    if (busy) return;
    if (onLogin) {
      await onLogin();
    } else if (onSignIn) {
      await onSignIn();
    } else if (handleAccount) {
      await handleAccount();
    }
  };

  const headerIcon = (
    <View style={styles.iconCircle}>
      <Text style={styles.iconEmoji}>🍊</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Accessible Step Indicator */}
      <AppText variant="smSemi" color={COLORS.textSecondary}>
        {t.onboardingStepMode}
      </AppText>

      {/* 1:1 Prototype Green Top Cell Header */}
      <GreenTopCell
        centered
        headerIcon={headerIcon}
        title={t.welcomeHeaderTitle}
        subtitle={
          isFil
            ? 'Pangsuporta sa desisyon sa pananim na Mangga, Saging, at Papaya'
            : 'Decision-support tool for Mango, Banana, and Papaya growers'
        }
      />

      {/* Bilingual prototype title support for verification */}
      <View style={styles.srOnly} pointerEvents="none">
        <Text>Maligayang Pagdating sa PrutasAI</Text>
        <Text>Welcome to PrutasAI</Text>
      </View>

      <AppText variant="sm" color={COLORS.textSecondary} center>
        {t.welcomeTitle}
      </AppText>

      {/* 1:1 Prototype Language Selector Card */}
      <FrostedCard style={styles.langCard}>
        <View style={styles.langInfo}>
          <Text style={styles.langTitle}>
            {isFil ? 'Piliin ang Wika' : 'Select Language'}
          </Text>
          <Text style={styles.langSub}>
            {isFil ? 'Filipino (Tagalog)' : 'English'}
          </Text>
        </View>
        <View style={styles.langBtnRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filipino language"
            onPress={() => onSelectLanguage?.('FIL')}
            style={[
              styles.langBtn,
              isFil ? styles.langBtnActive : styles.langBtnInactive,
            ]}
          >
            <Text
              style={[
                styles.langBtnText,
                isFil ? styles.langBtnTextActive : styles.langBtnTextInactive,
              ]}
            >
              🇵🇭 FIL
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="English language"
            onPress={() => onSelectLanguage?.('EN')}
            style={[
              styles.langBtn,
              !isFil ? styles.langBtnActive : styles.langBtnInactive,
            ]}
          >
            <Text
              style={[
                styles.langBtnText,
                !isFil ? styles.langBtnTextActive : styles.langBtnTextInactive,
              ]}
            >
              🇺🇸 EN
            </Text>
          </Pressable>
        </View>
      </FrostedCard>

      {/* 1:1 Prototype Path 1: Recommended Offline Guest */}
      <FrostedCard
        onPress={() => setChoice('offline')}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t.welcomeChooseOffline}
        accessibilityState={{ selected: choice === 'offline', disabled: busy }}
        style={[
          styles.pathCard,
          styles.path1Card,
          choice === 'offline' && styles.pathCardSelected,
        ]}
      >
        <View style={styles.pathRow}>
          <Text style={styles.pathEmoji}>🔒</Text>
          <View style={styles.pathContent}>
            <Text style={[styles.pathTitle, styles.path1Title]}>
              {isFil
                ? 'Magpatuloy nang Ganap na Offline (Rekomendado)'
                : 'Continue Fully Offline (Recommended)'}
            </Text>
            <Text style={styles.pathBlurb}>
              {isFil
                ? 'Walang account o internet na kailangan. Lahat ng litrato at tala ay mananatili lamang sa telepono.'
                : 'No registration needed. Photographs and records remain completely on-device.'}
            </Text>
            <Text style={styles.hiddenText}>{t.welcomeChooseOffline}</Text>
          </View>
        </View>
      </FrostedCard>

      {/* 1:1 Prototype Path 2: Optional Account Registration */}
      <FrostedCard
        onPress={() => setChoice('account')}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t.welcomeAccountTitle}
        accessibilityState={{ selected: choice === 'account', disabled: busy }}
        style={[
          styles.pathCard,
          choice === 'account' && styles.pathCardSelected,
        ]}
      >
        <View style={styles.pathRow}>
          <Text style={styles.pathEmoji}>☁️</Text>
          <View style={styles.pathContent}>
            <Text style={[styles.pathTitle, styles.path2Title]}>
              {isFil
                ? 'Gumawa ng Account (Opsyonal na Cloud Sync)'
                : 'Create Account (Optional Sync)'}
            </Text>
            <Text style={styles.pathBlurb}>
              {isFil
                ? 'I-sync ang monitoring notes sa pagitan ng mga telepono gamit ang iyong email.'
                : 'Sync monitoring checkpoints across devices using your email.'}
            </Text>
            <Text style={styles.hiddenText}>{t.welcomeAccountTitle}</Text>
          </View>
        </View>
      </FrostedCard>

      {/* Error Notice */}
      {error && (
        <Col gap={SPACING.sm}>
          <AppText
            variant="smSemi"
            color={COLORS.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {t.onboardingSaveFailed}
          </AppText>
          <Button label={t.retry} onPress={handleSubmit} variant="secondary" />
        </Col>
      )}

      {/* Submit Choice */}
      {choice && (
        <BtnForestFull
          label={choice === 'offline' ? t.onboardingFinishSetup : t.onboardingReviewConsent}
          onPress={handleSubmit}
          disabled={busy}
          accessibilityLabel={choice === 'offline' ? t.onboardingFinishSetup : t.onboardingReviewConsent}
        />
      )}

      {busy ? (
        <AppText variant="sm" color={COLORS.textSecondary} center accessibilityLiveRegion="polite">
          {t.onboardingSaving}
        </AppText>
      ) : null}

      {/* 1:1 Prototype Footer Link: Already have an account? Log In */}
      <View style={styles.footerRow}>
        <BtnSubtle
          label={isFil ? 'Mayroon nang account? Mag-log in' : 'Already have an account? Log In'}
          textColor="#154d2e"
          onPress={handleSignIn}
          accessibilityLabel={t.welcomeAlreadyHaveAccount}
          style={styles.signInBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 26,
  },
  langCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  langInfo: {
    flex: 1,
  },
  langTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    color: '#1e293b',
  },
  langSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#64748b',
    marginTop: 2,
  },
  langBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  langBtnInactive: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(21, 77, 46, 0.14)',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },
  langBtnTextActive: {
    color: '#92400e',
  },
  langBtnTextInactive: {
    color: '#64748b',
  },
  pathCard: {
    padding: 16,
  },
  path1Card: {
    borderWidth: 2,
    borderColor: '#154d2e',
  },
  pathCardSelected: {
    backgroundColor: '#f0fdf4',
  },
  pathRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  pathEmoji: {
    fontSize: 24,
  },
  pathContent: {
    flex: 1,
  },
  pathTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
  },
  path1Title: {
    color: '#154d2e',
  },
  path2Title: {
    color: '#1e293b',
  },
  pathBlurb: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: FONTS.regular,
    color: '#64748b',
    marginTop: 3,
  },
  hiddenText: {
    fontSize: 1,
    color: 'transparent',
    height: 0,
    width: 0,
    overflow: 'hidden',
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  signInBtn: {
    minHeight: 48,
    justifyContent: 'center',
  },
});
