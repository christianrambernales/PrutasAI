import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { prepareAppDatabase } from './src/core/db/appDatabase';
import { AppText, COLORS, ErrorBoundary, SPACING, useT } from './src/ui';

type Startup =
  | { status: 'opening' }
  | { status: 'ready' }
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

  useEffect(() => {
    // Before the warm-up, not after: on a page without the isolation headers
    // the open fails with a message about SharedArrayBuffer, which says nothing
    // about what to do. Naming the real cause is only possible here.
    if (browserBlocksDatabase()) {
      setStartup({ status: 'notIsolated' });
      return;
    }

    let cancelled = false;
    prepareAppDatabase().then(
      () => !cancelled && setStartup({ status: 'ready' }),
      (error: unknown) =>
        !cancelled &&
        setStartup({ status: 'failed', detail: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {startup.status === 'ready' ? (
        <ErrorBoundary>
          <AppNavigator />
        </ErrorBoundary>
      ) : (
        <Startup startup={startup} />
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
function Startup({ startup }: { startup: Exclude<Startup, { status: 'ready' }> }) {
  const t = useT();

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
        </>
      ) : (
        <>
          <AppText variant="lg" color={COLORS.error} center>
            {t.startupFailedTitle}
          </AppText>
          <AppText variant="sm" color={COLORS.textSecondary} center style={{ marginTop: SPACING.sm }}>
            {t.startupFailedBody}
          </AppText>
          {/* The raw message. Unreadable to a grower, but it is the difference
              between a bug report that can be acted on and "it went white". */}
          <AppText variant="xs" color={COLORS.textLight} center style={{ marginTop: SPACING.lg }}>
            {startup.detail}
          </AppText>
        </>
      )}
    </View>
  );
}
