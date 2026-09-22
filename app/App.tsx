import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { prepareAppDatabase } from './src/core/db/appDatabase';
import type { SqlDriver } from './src/core/db/driver';
import { AppText, Button, COLORS, ErrorBoundary, SPACING, strings, useT } from './src/ui';

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
 * bottom navigation's own surface can extend under the gesture bar instead of
 * floating above a strip of page background.
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
    };
  }, [start]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {startup.status === 'ready' ? (
        <ErrorBoundary>
          <AppNavigator db={startup.driver} />
        </ErrorBoundary>
      ) : (
        <Startup startup={startup} onRetry={start} />
      )}
    </SafeAreaProvider>
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
        backgroundColor: COLORS.surface,
      }}
    >
      {startup.status === 'opening' ? (
        <>
          <ActivityIndicator color={COLORS.primary} />
          <AppText variant="sm" color={COLORS.textSecondary} center style={{ marginTop: SPACING.md }}>
            {t.startingUp}
          </AppText>
        </>
      ) : startup.status === 'notIsolated' ? (
        // A known, diagnosable cause, so it gets its own wording. The generic
        // failure below would say "close the app and open it again", which does
        // not help: reopening the same URL fails identically every time.
        <>
          <AppText variant="lg" color={COLORS.error} center>
            {t.notIsolatedTitle}
          </AppText>
          <AppText variant="sm" color={COLORS.textSecondary} center style={{ marginTop: SPACING.sm }}>
            {t.notIsolatedBody}
          </AppText>
          <AppText variant="xs" color={COLORS.textSecondary} center style={{ marginTop: SPACING.sm }}>
            {fil.notIsolatedTitle}
          </AppText>
          <View style={{ marginTop: SPACING.xl }}><Button label={t.tryAgain} onPress={onRetry} /></View>
        </>
      ) : (
        <>
          <AppText variant="lg" color={COLORS.error} center>
            {t.startupFailedTitle}
          </AppText>
          <AppText variant="sm" color={COLORS.textSecondary} center style={{ marginTop: SPACING.sm }}>
            {t.startupFailedBody}
          </AppText>
          <AppText variant="xs" color={COLORS.textSecondary} center style={{ marginTop: SPACING.sm }}>
            {fil.startupFailedTitle} — {fil.startupFailedBody}
          </AppText>
          <View style={{ marginTop: SPACING.xl }}><Button label={t.tryAgain} onPress={onRetry} /></View>
          <View style={{ marginTop: SPACING.sm }}>
            <Button
              label={showDetail ? t.hideTechnicalDetails : t.showTechnicalDetails}
              variant="secondary"
              onPress={() => setShowDetail(value => !value)}
            />
          </View>
          {showDetail ? (
            <AppText variant="xs" color={COLORS.textLight} center style={{ marginTop: SPACING.lg }}>
              {startup.detail}
            </AppText>
          ) : null}
        </>
      )}
    </View>
  );
}
