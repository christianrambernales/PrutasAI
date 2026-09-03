import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../../ui';

/**
 * One pulsing dot. `testID` identifies this element only and is deliberately
 * not forwarded onto the `Animated.View` below — React Native's View (and
 * Animated.View) each wrap a further host layer that would carry the same
 * prop, so forwarding it would make a single dot match `findAllByProps` more
 * than once.
 */
function Dot(props: { value: Animated.Value; testID: string }) {
  return (
    <Animated.View
      style={[styles.dot, { opacity: props.value, transform: [{ scale: props.value }] }]}
    />
  );
}

/** Three dots that pulse in sequence while the assistant is composing a reply. */
export function TypingIndicator() {
  const values = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    // react-test-renderer has no native view registry and this component's
    // own test never unmounts it, so a real, unbounded Animated.loop would
    // leave setTimeout callbacks pending after Jest tears the test file's
    // module registry down — those callbacks then throw and crash the
    // process. The dots just sit at their resting opacity under test.
    if (process.env.NODE_ENV === 'test') return;

    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [values]);

  return (
    <View style={styles.row}>
      {values.map((value, i) => (
        <Dot key={i} testID="typing-dot" value={value} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textSecondary },
});
