import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText, Card, Col, COLORS, EmojiBadge, Icon, PressableRow, Row, SPACING, StatusChip, useT, SEVERITY_LABEL, RADIUS } from '../../ui';
import type { ScanSummary } from '../viewModels';

export function ScanRow({ scan, onPress }: { scan: ScanSummary; onPress?: () => void }) {
  const t = useT();
  const [imageError, setImageError] = useState(false);
  // A model-free record gets the explicit truthful status rather than the
  // generic severity-token label for an undetermined row.
  const badgeLabel = scan.status === 'undetermined' ? t.resultNotAnalyzed : SEVERITY_LABEL[scan.status];
  return (
    <PressableRow accessibilityLabel={scan.title} onPress={onPress}>
      <Card>
        <Row gap={SPACING.md - 4}>
          {scan.imageUri && !imageError ? (
            <Image
              source={{ uri: scan.imageUri }}
              style={styles.thumb}
              testID={`scan-photo-${scan.id}`}
              onError={() => setImageError(true)}
            />
          ) : imageError ? (
            <View style={[styles.thumb, styles.errorThumb]}>
              <AppText variant="xs" color={COLORS.textSecondary} center numberOfLines={2}>
                {t.localPhotoUnavailable}
              </AppText>
            </View>
          ) : (
            <EmojiBadge emoji={scan.emoji} size={44} square />
          )}
          <Col gap={SPACING.xs + 2} style={{ flex: 1 }}>
            <AppText variant="mdSemi">{scan.title}</AppText>
            <Row gap={SPACING.xs + 2}>
              <StatusChip status={scan.status} label={badgeLabel} />
              <AppText variant="sm" color={COLORS.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                {scan.detail}
              </AppText>
            </Row>
          </Col>
          <Col gap={SPACING.xs + 2} align="flex-end">
            <AppText variant="xs" color={COLORS.textLight}>
              {scan.timeLabel}
            </AppText>
            <Icon name="chevronRight" size={18} color={COLORS.textLight} />
          </Col>
        </Row>
      </Card>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: '#171d1a',
  },
  errorThumb: {
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
});
