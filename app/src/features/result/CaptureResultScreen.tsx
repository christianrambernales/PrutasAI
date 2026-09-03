import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  AppText, Button, Card, Col, COLORS, Divider, Icon, RADIUS, Row, Section, SPACING, Tile, useT,
} from '../../ui';

export interface CaptureResultScreenProps {
  /** Local file URI of the photo just taken. */
  photoUri: string;
  /** Straight from core/status — what the installed models can actually do. */
  capabilityHeadline: string;
  capabilityDetail: string;
  depth: 0 | 1 | 2 | 3;
  /**
   * Set when a stored scan is reopened: exactly what the row holds, so two
   * different scans read as two different scans. Absent for a fresh capture,
   * which has no record yet.
   */
  record?: { title: string; detail: string; timeLabel: string };
  onOpenModelStatus: () => void;
  onScanAgain: () => void;
}

/**
 * What a fresh capture shows.
 *
 * This screen exists because the alternative was worse: the capture flow used
 * to push the design-preview result, so pressing the shutter with no models
 * installed produced a confident variety, a named disease, a severity
 * percentage and a treatment plan — none of which any model had produced. A
 * scan reports what the pipeline actually knows, and when it knows nothing it
 * says so.
 */
export function CaptureResultScreen(props: CaptureResultScreenProps) {
  const t = useT();
  const { photoUri, capabilityHeadline, capabilityDetail, depth, record } = props;

  return (
    <>
      <Section>
        <View style={styles.photo}>
          {photoUri === '' ? (
            // Restored from another device: the photograph never left the
            // phone that took it, so there is nothing here to show. An honest
            // absence, not a stand-in — that fabrication is the bug this
            // screen exists to prevent.
            <View style={styles.noPhoto}>
              <Icon name="shield" size={20} color={COLORS.textSecondary} />
              <AppText variant="xs" color={COLORS.textSecondary} style={{ textAlign: 'center' }}>
                {t.photoNotOnThisDevice}
              </AppText>
            </View>
          ) : (
            <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
          )}
        </View>
      </Section>

      {record ? (
        <Section>
          <Row justify="space-between" align="baseline">
            <Col gap={2}>
              <AppText variant="mdSemi">{record.title}</AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>{record.detail}</AppText>
            </Col>
            <AppText variant="xs" color={COLORS.textLight}>{record.timeLabel}</AppText>
          </Row>
        </Section>
      ) : null}

      <Section>
        <Card style={{ gap: SPACING.md - 4, borderColor: COLORS.severityEarly }}>
          <Row gap={SPACING.sm + 2} align="flex-start">
            <Icon name="warning" size={20} color={COLORS.accent} />
            <Col gap={SPACING.xs} style={{ flex: 1 }}>
              <AppText variant="lg">{capabilityHeadline}</AppText>
              <AppText variant="sm" color={COLORS.textSecondary}>{capabilityDetail}</AppText>
            </Col>
          </Row>
          <Divider />
          <AppText variant="xs" color={COLORS.textSecondary}>
            {depth === 0
              ? 'The photo was kept on this device. No stage of the pipeline can run until model weights are installed, so no fruit, variety or disease is reported.'
              : 'The inference runtime is not wired yet, so the installed weights are not being run. Nothing is inferred from this photo.'}
          </AppText>
        </Card>
      </Section>

      <Section>
        <Tile>
          <Row gap={SPACING.sm} align="flex-start">
            <Icon name="shield" size={16} color={COLORS.textSecondary} />
            <AppText variant="xs" color={COLORS.textSecondary} style={{ flex: 1 }}>
              {t.photoStayedOnThisDevice}
            </AppText>
          </Row>
        </Tile>
      </Section>

      <Section gap={SPACING.sm}>
        <Button label="Open model status" icon="package" onPress={props.onOpenModelStatus} />
        <Button label="Scan again" icon="camera" variant="secondary" onPress={props.onScanAgain} />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  photo: {
    height: 260,
    borderRadius: RADIUS.md,
    backgroundColor: '#171d1a',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  noPhoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
});
