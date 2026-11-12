import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { COLORS } from '../tokens';

/** Shared boundary for startup, onboarding, capture, overlays and navigation.
 * Real system insets stay with the screen/camera chrome; this adds none.
 */
export function AppViewport({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.canvas}>
      <View testID="app-viewport" style={[styles.viewport, Platform.OS === 'web' && styles.web]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: COLORS.background },
  viewport: { flex: 1, width: '100%', backgroundColor: COLORS.background },
  web: { maxWidth: 395, alignSelf: 'center' },
});
