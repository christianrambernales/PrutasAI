import React from 'react';
import { View } from 'react-native';

import { AppText } from './primitives';
import { COLORS, SPACING } from '../tokens';
import { useT } from '../i18n/LanguageContext';

interface Props {
  children: React.ReactNode;
}

interface State {
  detail: string | null;
}

/**
 * Catches a throw during render and shows it.
 *
 * `App.tsx`'s startup gate handles a failed database warm-up, but it cannot
 * reach an exception raised later, while `AppNavigator` renders. React unmounts
 * the tree for those, which is exactly the blank white page this project treats
 * as a defect rather than a cosmetic problem.
 *
 * A class, because `getDerivedStateFromError` has no hook equivalent.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { detail: null };

  static getDerivedStateFromError(error: unknown): State {
    return { detail: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.detail === null) return this.props.children;
    return <ErrorFallback detail={this.state.detail} />;
  }
}

/**
 * Split out so it can use the dictionary hook, which a class cannot call.
 *
 * This sits outside `LanguageProvider` — it wraps the navigator that contains
 * it — so it renders in the dictionary's English default, the same accepted
 * behaviour as the startup screen in `App.tsx`.
 */
function ErrorFallback({ detail }: { detail: string }) {
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
      <AppText variant="lg" color={COLORS.error} center>
        {t.unexpectedErrorTitle}
      </AppText>
      <AppText variant="sm" color={COLORS.textSecondary} center style={{ marginTop: SPACING.sm }}>
        {t.startupFailedBody}
      </AppText>
      {/* The raw message. Unreadable to a grower, but it is the difference
          between a bug report that can be acted on and "it went white". */}
      <AppText variant="xs" color={COLORS.textLight} center style={{ marginTop: SPACING.lg }}>
        {detail}
      </AppText>
    </View>
  );
}
