import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { describeDetectionCapability } from '../../core/status';
import { resolveModels } from '../../core/ml/registry';
import { bundledModels } from '../../core/ml/bundledModels';
import manifest from '../../core/ml/manifest.json';

export function ModelStatusScreen() {
  const statuses = resolveModels(manifest, bundledModels, {});
  const capability = describeDetectionCapability(statuses);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>{capability.headline}</Text>
      <Text>{capability.detail}</Text>
      <Text style={{ marginTop: 16, fontWeight: '600' }}>Models ({statuses.length})</Text>
      {statuses.length === 0 && <Text>No models declared in manifest.json.</Text>}
      {statuses.map(s => (
        <View key={s.id}>
          <Text>{`Stage ${s.stage} · ${s.id} · ${s.state}${s.source ? ` (${s.source})` : ''}`}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
