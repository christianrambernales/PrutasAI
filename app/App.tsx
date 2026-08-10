import React from 'react';
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ModelStatusScreen } from './src/features/modelStatus/ModelStatusScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <ModelStatusScreen />
    </SafeAreaView>
  );
}
