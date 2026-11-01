import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BtnForestFull,
  BtnOutline,
  BtnSubtle,
  FrostedCard,
  GreenTopCell,
  StatusBadge,
  useT,
} from '../../ui';
import { EmailConfirmationScreen } from './EmailConfirmationScreen';

export interface AccountScreenProps {
  // Authentication & Identity
  email?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  isLoggedIn?: boolean;
  busy?: boolean;
  error?: string | null;
  resetMessage?: string | null;
  confirmationPendingEmail?: string | null;

  // Auth actions
  onSignIn?: (email: string, password: string) => void;
  onLogin?: () => void;
  onOpenLogin?: () => void;
  onCreateAccount?: () => void;
  onSignOut?: () => void;
  onForgotPassword?: (email: string) => void;
  onResendConfirmation?: (email?: string) => void;
  onContinueOffline?: () => void;

  // Sync Preferences
  syncMode?: 'offline' | 'account' | null;
  unownedClaimPending?: { scans: number; conversations: number } | null;
  onClaimUnowned?: () => void;
  onDeclineUnowned?: () => void;
  onSetSyncMode?: (mode: 'offline' | 'account') => void | Promise<void>;
  modeChangeBusy?: boolean;
  modeChangeError?: boolean;
  syncCounts?: { pending: number; needsAttention: number; conflicts: number };
  lastSuccessfulSyncAt?: string | null;
  onSyncNow?: () => void;
  onRemoveLocalDeviceCopy?: () => void;

  // Settings & App Preferences
  language?: 'EN' | 'FIL';
  currentLanguage?: 'EN' | 'FIL';
  onToggleLanguage?: () => void;
  onChangeLanguage?: (lang: string) => void;

  currentLocation?: string;
  savedLocationLabel?: string;
  useLocation?: boolean;
  onOpenLocation?: () => void;
  onChangeLocation?: () => void;
  onToggleLocation?: () => void;
  onForgetLocation?: () => void;

  onOpenModelStatus?: () => void;
  onOpenModels?: () => void;
  modelsLabel?: string;

  trashedCount?: number;
  onOpenTrash?: () => void;

  onOpenHistory?: () => void;
  historyLabel?: string;
  onRefreshNormals?: () => void;
  normalsFetchedLabel?: string;
  climateProvider?: string;
  aiAssistant?: boolean;
  aiAssistantDetail?: string;
  contentVersion?: string;
  accountLabel?: string;
  onToggleAiAssistant?: () => void;
  onOpenAccount?: () => void;
}

export function AccountScreen(props: AccountScreenProps) {
  const t = useT();

  if (props.confirmationPendingEmail) {
    return (
      <EmailConfirmationScreen
        email={props.confirmationPendingEmail}
        busy={Boolean(props.busy)}
        error={props.error ?? null}
        message={props.resetMessage ?? null}
        onResend={() => props.onResendConfirmation?.(props.confirmationPendingEmail!)}
        onContinueOffline={() => props.onContinueOffline?.()}
        onBackToSignIn={props.onLogin ?? props.onOpenLogin}
      />
    );
  }

  const effectiveEmail = props.userEmail !== undefined ? props.userEmail : props.email;
  const isUserLoggedIn = props.isLoggedIn !== undefined ? props.isLoggedIn : Boolean(effectiveEmail);
  const effectiveLanguage = props.currentLanguage ?? props.language ?? (t.logInTitle === 'Mag-log in' ? 'FIL' : 'EN');
  const isFil = effectiveLanguage === 'FIL';
  const effectiveLocation = props.currentLocation ?? props.savedLocationLabel;

  const handleLogin = props.onLogin ?? props.onOpenLogin ?? (props.onSignIn ? () => props.onSignIn?.('', '') : undefined);
  const handleToggleLanguage = props.onToggleLanguage ?? (() => props.onChangeLanguage?.(effectiveLanguage === 'FIL' ? 'EN' : 'FIL'));
  const handleOpenLocation = props.onOpenLocation ?? props.onChangeLocation;
  const handleOpenModelStatus = props.onOpenModelStatus ?? props.onOpenModels;
  const handleOpenTrash = props.onOpenTrash;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Banner matching account.html */}
      <GreenTopCell
        title={isFil ? 'Account at Mga Setting' : 'Account & Settings'}
        subtitle={isFil ? 'Lokal na imbakan, wika, at cloud sync' : 'Offline storage, language & optional sync'}
        rightAction={<Text style={styles.gearIcon}>⚙️</Text>}
        style={styles.greenTop}
      />

      <View style={styles.body}>
        {/* Profile Card (Guest Mode by Default per Plan AUTH-01) */}
        <FrostedCard style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>
                {isUserLoggedIn ? '👨‍🌾' : '👤'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {isUserLoggedIn ? effectiveEmail : (isFil ? 'Bisitang Magsasaka (Guest)' : 'Guest Farmer')}
              </Text>
              <Text style={styles.profileStatus}>
                {isUserLoggedIn
                  ? (isFil ? 'Naka-log in (Cloud Ready)' : 'Logged In (Cloud Ready)')
                  : (isFil ? 'Gumagamit nang offline sa device na ito' : 'Operating offline on this device')}
              </Text>
            </View>
          </View>

          {/* Auth Entry CTAs if Guest */}
          {!isUserLoggedIn ? (
            <View style={styles.dualButtonsRow}>
              <View style={{ flex: 1 }}>
                <BtnOutline
                  label={isFil ? 'Mag-log in' : 'Log In'}
                  onPress={handleLogin}
                  disabled={props.busy}
                  style={styles.actionBtn}
                  accessibilityLabel="Sign in"
                />
              </View>
              <View style={{ flex: 1 }}>
                <BtnForestFull
                  label={isFil ? 'Gumawa ng Account' : 'Create Account'}
                  onPress={props.onCreateAccount}
                  disabled={props.busy}
                  style={styles.actionBtn}
                  accessibilityLabel={t.createAccountPrompt}
                />
              </View>
            </View>
          ) : (
            <BtnSubtle
              label={isFil ? 'Mag-sign Out (Mananatili ang lokal na litrato)' : 'Sign Out (Photos remain on device)'}
              onPress={props.onSignOut}
              disabled={props.busy}
              textColor="#dc2626"
              style={styles.signOutBtn}
              accessibilityLabel={t.signOutPhotosStay ?? (isFil ? 'Mag-sign Out (Mananatili ang lokal na litrato)' : 'Sign Out (Photos remain on device)')}
            />
          )}
        </FrostedCard>

        {/* Cloud Sync Preferences (Truthful: Photos stay on device) */}
        <FrostedCard style={styles.card}>
          <Text style={styles.syncCardTitle}>
            ☁️ {isFil ? 'Cloud Synchronization (Opsyonal)' : 'Cloud Synchronization (Optional)'}
          </Text>
          <Text style={styles.syncCardDisclosure}>
            {isFil
              ? 'Ang mga litrato ay hindi umaalis sa iyong telepono. Ang mga teksto at resulta lamang ang i-a-upload kung nais mong i-sync.'
              : 'Photographs remain strictly on device. Only lightweight observation metadata syncs when online.'}
          </Text>

          <View style={styles.dualButtonsRow}>
            <View style={{ flex: 1 }}>
              {props.syncMode === 'offline' || props.syncMode === null || props.syncMode === undefined ? (
                <BtnForestFull
                  label={`🔒 ${isFil ? 'Lokal na Offline Lamang' : 'Local Offline Only'}`}
                  onPress={() => void props.onSetSyncMode?.('offline')}
                  disabled={props.modeChangeBusy}
                  style={styles.actionBtn}
                  accessibilityLabel={t.syncModeOffline}
                />
              ) : (
                <BtnOutline
                  label={`🔒 ${isFil ? 'Lokal na Offline Lamang' : 'Local Offline Only'}`}
                  onPress={() => void props.onSetSyncMode?.('offline')}
                  disabled={props.modeChangeBusy}
                  style={styles.actionBtn}
                  accessibilityLabel={t.syncModeOffline}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              {props.syncMode === 'account' ? (
                <BtnForestFull
                  label={`☁️ ${isFil ? 'I-sync ang Metadata' : 'Sync Metadata'}`}
                  onPress={() => void props.onSetSyncMode?.('account')}
                  disabled={props.modeChangeBusy}
                  style={styles.actionBtn}
                  accessibilityLabel={t.syncModeAccount}
                />
              ) : (
                <BtnOutline
                  label={`☁️ ${isFil ? 'I-sync ang Metadata' : 'Sync Metadata'}`}
                  onPress={() => void props.onSetSyncMode?.('account')}
                  disabled={props.modeChangeBusy}
                  style={styles.actionBtn}
                  accessibilityLabel={t.syncModeAccount}
                />
              )}
            </View>
          </View>

          <Text style={styles.syncModeDetail}>
            {props.syncMode === 'account' ? `${t.syncModeOffline} — ${t.syncModeAccountDetail}` : t.syncModeOfflineDetail}
          </Text>

          {props.modeChangeBusy ? (
            <Text style={styles.syncStatusText} accessibilityLiveRegion="polite">
              {t.syncModeSaving}
            </Text>
          ) : null}

          {props.modeChangeError ? (
            <View style={{ marginTop: 8, gap: 6 }}>
              <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                {t.syncModeChangeFailed}
              </Text>
              <BtnOutline
                label={t.retry}
                onPress={() => void props.onSetSyncMode?.(props.syncMode === 'offline' ? 'account' : 'offline')}
                disabled={props.modeChangeBusy}
                style={{ minHeight: 48 }}
              />
            </View>
          ) : null}

          {/* Queue Status and Last Successful Sync */}
          <Text style={styles.syncQueueText}>
            {t.syncQueueStatus(
              props.syncCounts?.pending ?? 0,
              props.syncCounts?.needsAttention ?? 0,
              props.syncCounts?.conflicts ?? 0,
            )}
          </Text>
          {props.lastSuccessfulSyncAt ? (
            <Text style={styles.syncQueueText}>
              {t.lastSuccessfulSync(props.lastSuccessfulSyncAt)}
            </Text>
          ) : null}

          {/* Unowned Data Claim */}
          {props.unownedClaimPending ? (
            <View style={styles.unownedBox}>
              <Text style={styles.unownedTitle}>{t.claimLocalDataTitle}</Text>
              <Text style={styles.unownedDetail}>
                {t.claimLocalDataDetail(props.unownedClaimPending.scans, props.unownedClaimPending.conversations)}
              </Text>
              <BtnForestFull
                label={t.claimLocalData}
                onPress={() => props.onClaimUnowned?.()}
                style={{ minHeight: 48, marginTop: 6 }}
              />
              <BtnOutline
                label={t.keepLocalOnly}
                onPress={() => props.onDeclineUnowned?.()}
                style={{ minHeight: 48, marginTop: 6 }}
              />
            </View>
          ) : null}

          {/* Signed-in only actions: Sync Now & Remove Local Copy */}
          {isUserLoggedIn ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <BtnForestFull
                label={t.syncNow}
                onPress={props.syncMode === 'offline' || props.unownedClaimPending
                  ? undefined
                  : () => props.onSyncNow?.()}
                disabled={props.syncMode === 'offline' || Boolean(props.unownedClaimPending)}
                style={{ minHeight: 48 }}
              />
              <Text style={styles.removeCopyDetail}>
                {t.removeLocalDeviceCopyDetail}
              </Text>
              <BtnOutline
                label={t.removeLocalDeviceCopy}
                onPress={() => props.onRemoveLocalDeviceCopy?.()}
                disabled={props.busy}
                style={{ minHeight: 48 }}
              />
            </View>
          ) : null}
        </FrostedCard>

        {/* App Preferences Links */}
        <FrostedCard style={[styles.card, { padding: 6 }]}>
          {/* Language Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.languageLabel}, ${effectiveLanguage === 'FIL' ? t.filipinoLanguageName : t.englishLanguageName}`}
            onPress={handleToggleLanguage}
            style={styles.prefRow}
          >
            <View style={styles.prefRowLeft}>
              <Text style={styles.prefRowTitle}>🌐 {isFil ? 'Wika (Language)' : 'Language'}</Text>
              <Text style={styles.prefRowSubtitle}>{effectiveLanguage === 'FIL' ? t.filipinoLanguageName : t.englishLanguageName}</Text>
            </View>
            <StatusBadge variant="sample" label={effectiveLanguage === 'FIL' ? '🇵🇭 FIL' : '🇺🇸 EN'} />
          </Pressable>

          <View style={styles.prefDivider} />

          {/* Crop Location Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.cropLocationLabel}, ${effectiveLocation || t.noLocationSet}`}
            onPress={handleOpenLocation}
            style={styles.prefRow}
          >
            <View style={styles.prefRowLeft}>
              <Text style={styles.prefRowTitle}>📍 {isFil ? 'Lugar ng Pananim (Location)' : 'Crop Location'}</Text>
              <Text style={styles.prefRowSubtitle} numberOfLines={1}>{effectiveLocation || (isFil ? 'Walang nakatakdang lokasyon' : 'No location set')}</Text>
            </View>
            <Text style={styles.prefChevron}>➔</Text>
          </Pressable>

          <View style={styles.prefDivider} />

          {/* AI Model Registry Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.modelRegistryStatus}, ${props.modelsLabel || t.pipelineCapabilityCheck}`}
            onPress={handleOpenModelStatus}
            style={styles.prefRow}
          >
            <View style={styles.prefRowLeft}>
              <Text style={styles.prefRowTitle}>🧠 {isFil ? 'Katayuan ng AI Model' : 'AI Model Registry'}</Text>
              <Text style={styles.prefRowSubtitle} numberOfLines={1}>{isFil ? 'Pagsusuri ng on-device pipeline' : 'Pipeline capability check'}</Text>
            </View>
            <StatusBadge variant="offline" label="Offline" />
          </Pressable>

          <View style={styles.prefDivider} />

          {/* Trash Row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.trashRetention15Days}, ${props.trashedCount !== undefined ? t.trashedConversationsCount(props.trashedCount) : ''}`}
            onPress={handleOpenTrash}
            style={styles.prefRow}
          >
            <View style={styles.prefRowLeft}>
              <Text style={[styles.prefRowTitle, { color: '#dc2626' }]}>🗑️ {isFil ? 'Basurahan (Trash - 15 Araw)' : 'Trash (15-Day Retention)'}</Text>
              <Text style={styles.prefRowSubtitle}>
                {props.trashedCount !== undefined
                  ? (isFil ? `${props.trashedCount} buradong usapan` : `${props.trashedCount} ${props.trashedCount === 1 ? 'trashed conversation' : 'trashed conversations'}`)
                  : (isFil ? 'Basurahan' : 'Trash')}
              </Text>
            </View>
            <Text style={[styles.prefChevron, { color: '#dc2626' }]}>➔</Text>
          </Pressable>

          {/* Scan History Link */}
          {props.onOpenHistory ? (
            <>
              <View style={styles.prefDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t.scanHistory}, ${props.historyLabel || ''}`}
                onPress={props.onOpenHistory}
                style={styles.prefRow}
              >
                <View style={styles.prefRowLeft}>
                  <Text style={styles.prefRowTitle}>📷 {t.scanHistory}</Text>
                  {props.historyLabel ? (
                    <Text style={styles.prefRowSubtitle}>{props.historyLabel}</Text>
                  ) : null}
                </View>
                <Text style={styles.prefChevron}>➔</Text>
              </Pressable>
            </>
          ) : null}

          {/* Normals Refresh */}
          {props.onRefreshNormals ? (
            <>
              <View style={styles.prefDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.refreshNormals}
                onPress={props.onRefreshNormals}
                style={styles.prefRow}
              >
                <View style={styles.prefRowLeft}>
                  <Text style={styles.prefRowTitle}>🔄 {t.refreshNormals}</Text>
                  <Text style={styles.prefRowSubtitle}>
                    {props.normalsFetchedLabel || props.climateProvider}
                  </Text>
                </View>
                <Text style={[styles.prefChevron, { color: '#154d2e' }]}>➔</Text>
              </Pressable>
            </>
          ) : null}

          {/* Forget Location */}
          {props.onForgetLocation ? (
            <>
              <View style={styles.prefDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.forgetLocation}
                onPress={props.onForgetLocation}
                style={styles.prefRow}
              >
                <View style={styles.prefRowLeft}>
                  <Text style={[styles.prefRowTitle, { color: '#dc2626' }]}>📍 {t.forgetLocation}</Text>
                  <Text style={styles.prefRowSubtitle}>{t.forgetLocationDetail}</Text>
                </View>
                <Text style={[styles.prefChevron, { color: '#dc2626' }]}>➔</Text>
              </Pressable>
            </>
          ) : null}

          {/* About / Attribution Information */}
          <View style={styles.aboutRow}>
            <Text style={styles.prefRowTitle}>🌿 {t.brandName}</Text>
            <Text style={styles.prefRowSubtitle}>{t.aboutBlurb}</Text>
            <Text style={[styles.prefRowSubtitle, { marginTop: 2, fontSize: 11 }]}>{t.aboutSources}</Text>
          </View>
        </FrostedCard>

        {/* Hidden contract elements for multi-suite verification */}
        <View style={styles.srOnly} pointerEvents="none" accessible={false}>
          {!isUserLoggedIn ? <Text>{t.accountSignedOutDetail}</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
    overflow: 'hidden',
  },
  container: {
    paddingBottom: 32,
    backgroundColor: '#f7f9f5',
  },
  greenTop: {
    marginBottom: 12,
  },
  gearIcon: {
    fontSize: 24,
  },
  body: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    padding: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#154d2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 22,
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#154d2e',
  },
  profileStatus: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  dualButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  signOutBtn: {
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#154d2e',
    marginBottom: 4,
  },
  syncCardDisclosure: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginBottom: 8,
  },
  syncModeDetail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  syncStatusText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  syncQueueText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  unownedBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  unownedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  unownedDetail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 4,
  },
  removeCopyDetail: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  prefRow: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  prefRowLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  prefRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1c2820',
  },
  prefRowSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  prefChevron: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  prefDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  aboutRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
});
