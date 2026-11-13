import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { prepareAppDatabase } from './src/core/db/appDatabase';
import type { SqlDriver } from './src/core/db/driver';
import { reloadLocalFonts, verifyLocalFonts } from './src/ui/reloadFonts';
import { AppText, AppViewport, Button, Card, COLORS, ErrorBoundary, FontProvider, fontAssets, Icon, SPACING, strings, useT } from './src/ui';

type Startup =
  | { status: 'opening' }
  | { status: 'ready'; driver: SqlDriver }
  | { status: 'failed'; detail: string }
  | { status: 'notIsolated' };

/**
 * True when the browser will refuse the database before we even try.
 *
 * expo-sqlite's synchronous web path allocates a `SharedArrayBuffer`, which
 * exists only on a cross-origin isolated page — one served with
 * `Cross-Origin-Opener-Policy: same-origin` and
 * `Cross-Origin-Embedder-Policy: require-corp`. `vercel.json` sets both for the
 * deployed site and `scripts/start-web.mjs` for local web.
 *
 * Checking here rather than letting the open fail turns "SharedArrayBuffer is
 * not defined" — which reads like an app bug — into a message naming the actual
 * mistake. Almost always that mistake is opening the Expo dev server's own port
 * instead of the proxy in front of it; Expo prints that port, and its `w`
 * shortcut opens it, so it is easy to reach by accident.
 *
 * `crossOriginIsolated` is a browser global. It is undefined on Android and iOS,
 * where none of this applies, so the check is false there.
 */
function browserBlocksDatabase(): boolean {
  return typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === false;
}

/**
 * Insets are applied inside the chrome rather than by a wrapper here, so the
 * floating bottom navigation clears the gesture bar without duplicate padding
 * on the shared web viewport.
 *
 * The database is opened before `AppNavigator` mounts, not inside it.
 * `AppNavigator` reads the database synchronously during its first render, and
 * on web that only works once the SQLite worker is running — see
 * `prepareDatabase`. Waiting here is what makes that render safe.
 *
 * A failure is shown, never swallowed. This gate replaced a blank white page:
 * the exception escaped `AppNavigator`'s first render, React unmounted the tree,
 * and the app told the user nothing at all.
 */
export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [fontRetry, setFontRetry] = useState<'idle' | 'loading' | 'loaded' | 'failed'>('idle');
  const [webFonts, setWebFonts] = useState<'waiting' | 'loaded' | 'failed'>('waiting');
  const fontAttempt = useRef(0);
  const [startup, setStartup] = useState<Startup>({ status: 'opening' });
  const startupAttempt = useRef(0);

  const start = useCallback(() => {
    const attempt = ++startupAttempt.current;
    if (browserBlocksDatabase()) {
      setStartup({ status: 'notIsolated' });
      return;
    }

    setStartup({ status: 'opening' });
    prepareAppDatabase().then(
      driver => attempt === startupAttempt.current && setStartup({ status: 'ready', driver }),
      (error: unknown) =>
        attempt === startupAttempt.current &&
        setStartup({ status: 'failed', detail: error instanceof Error ? error.message : String(error) }),
    );
  }, []);

  useEffect(() => {
    start();
    return () => {
      startupAttempt.current += 1;
      fontAttempt.current += 1;
    };
  }, [start]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !fontsLoaded || fontRetry !== 'idle') return;
    let active = true;
    verifyLocalFonts().then(
      () => active && setWebFonts('loaded'),
      () => active && setWebFonts('failed'),
    );
    return () => { active = false; };
  }, [fontsLoaded, fontRetry]);

  const retryFonts = () => {
    const attempt = ++fontAttempt.current;
    setFontRetry('loading');
    reloadLocalFonts().then(() => {
      if (attempt === fontAttempt.current) setFontRetry('loaded');
    }).catch(() => {
      if (attempt === fontAttempt.current) setFontRetry('failed');
    });
  };
  const localFontsReady = fontRetry === 'loaded' || (fontsLoaded && (Platform.OS !== 'web' || webFonts === 'loaded'));
  const fontsFailed = !!fontError || fontRetry === 'failed' || webFonts === 'failed';

  const handleStartupRetry = useCallback(() => {
    if (startup.status === 'notIsolated' && Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      window.location.reload();
      return;
    }
    start();
  }, [startup.status, start]);

  return (
    <SafeAreaProvider>
      <FontProvider value={localFontsReady}>
        <AppViewport>
        <StatusBar style={startup.status === 'ready' ? 'light' : 'dark'} />
        {!localFontsReady && fontsFailed ? <FontLoadNotice busy={fontRetry === 'loading'} onRetry={retryFonts} /> : null}
        {startup.status === 'ready' ? (
          <ErrorBoundary>
            <AppNavigator db={startup.driver} />
          </ErrorBoundary>
        ) : (
          <Startup startup={startup} onRetry={handleStartupRetry} />
        )}
        </AppViewport>
      </FontProvider>
    </SafeAreaProvider>
  );
}

/** Font failures remain actionable without hiding the independent database gate. */
function FontLoadNotice({ busy, onRetry }: { busy: boolean; onRetry: () => void }) {
  const t = strings('EN');
  const fil = strings('FIL');
  return (
    <View accessibilityRole="alert" style={{ padding: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.warningSurface }}>
      <AppText variant="sm" color={COLORS.warningText}>{t.fontLoadFailed}</AppText>
      <AppText variant="sm" color={COLORS.warningText}>{fil.fontLoadFailed}</AppText>
      <Button label={`${t.tryAgain} / ${fil.tryAgain}`} variant="secondary" disabled={busy} onPress={onRetry} />
    </View>
  );
}

/**
 * Shown only before the navigator exists, so it uses the primitives directly
 * rather than `Screen`, which expects to sit inside the navigation chrome.
 *
 * Wording comes from the dictionary's English default: this renders above
 * `LanguageProvider`, before the app has read the user's setting.
 */
function Startup({ startup, onRetry }: { startup: Exclude<Startup, { status: 'ready' }>, onRetry: () => void }) {
  const t = useT();
  const fil = strings('FIL');
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => setShowDetail(false), [startup.status]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.background,
      }}
    >
      {startup.status === 'opening' ? (
        <Card style={{ padding: SPACING.xl, gap: SPACING.md, alignItems: 'center', maxWidth: 395, width: '100%' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <AppText variant="sm" color={COLORS.textSecondary} center style={{ marginTop: SPACING.xs }}>
            {t.startingUp}
          </AppText>
        </Card>
      ) : startup.status === 'notIsolated' ? (
        // A known, diagnosable cause, so it gets its own wording. The generic
        // failure below would say "close the app and open it again", which does
        // not help: reopening the same URL fails identically every time.
        <Card style={{ padding: SPACING.xl, gap: SPACING.md, alignItems: 'center', maxWidth: 395, width: '100%' }}>
          <Icon name="warning" size={32} color={COLORS.error} />
          <AppText variant="lg" color={COLORS.error} center accessibilityRole="header">
            {t.notIsolatedTitle}
          </AppText>
          <AppText variant="sm" color={COLORS.textSecondary} center>
            {t.notIsolatedBody}
          </AppText>
          <AppText variant="xs" color={COLORS.textSecondary} center>
            {fil.notIsolatedTitle}
          </AppText>
          <AppText variant="xs" color={COLORS.textLight} center style={{ marginTop: SPACING.xs }}>
            Note: This is an offline on-device browser SQLite database requirement (needs cross-origin isolation), NOT an issue with your Supabase cloud database.
          </AppText>
          <View style={{ marginTop: SPACING.md, width: '100%' }}>
            <Button label={t.tryAgain} onPress={onRetry} />
          </View>
        </Card>
      ) : (
        <Card style={{ padding: SPACING.xl, gap: SPACING.md, alignItems: 'center', maxWidth: 395, width: '100%' }}>
          <Icon name="warning" size={32} color={COLORS.error} />
          <AppText variant="lg" color={COLORS.error} center accessibilityRole="header">
            {t.startupFailedTitle}
          </AppText>
          <AppText variant="sm" color={COLORS.textSecondary} center>
            {t.startupFailedBody}
          </AppText>
          <AppText variant="xs" color={COLORS.textSecondary} center>
            {fil.startupFailedTitle} — {fil.startupFailedBody}
          </AppText>
          <View style={{ marginTop: SPACING.md, width: '100%', gap: SPACING.sm }}>
            <Button label={t.tryAgain} onPress={onRetry} />
            <Button
              label={showDetail ? t.hideTechnicalDetails : t.showTechnicalDetails}
              variant="secondary"
              onPress={() => setShowDetail(value => !value)}
            />
          </View>
          {showDetail ? (
            <AppText variant="xs" color={COLORS.textLight} center style={{ marginTop: SPACING.md }}>
              {startup.detail}
            </AppText>
          ) : null}
        </Card>
      )}
    </View>
  );
}
