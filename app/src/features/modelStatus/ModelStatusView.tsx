import React from 'react';
import {
  AppText, Button, Card, Chip, Col, COLORS, Divider, Icon, Row, Section,
  SectionHeader, SPACING, Tile,
} from '../../ui';
import type { ModelRow } from '../viewModels';

export interface ModelStatusViewProps {
  headline: string;
  detail: string;
  /** 0–3, from pipelineDepth(). Drives which stage tiles read as available. */
  depth: 0 | 1 | 2 | 3;
  models: ModelRow[];
  manifestVersion: number;
  onImportModel: () => void;
}

const STAGES = [
  { stage: 1, label: 'Fruit' },
  { stage: 2, label: 'Variety' },
  { stage: 3, label: 'Disease' },
] as const;

const STATE_DOT: Record<ModelRow['state'], string> = {
  ready: COLORS.healthy,
  missing: COLORS.textLight,
  checksum_mismatch: COLORS.error,
};

const STATE_LABEL: Record<ModelRow['state'], string> = {
  ready: 'ready',
  missing: 'missing',
  checksum_mismatch: 'checksum mismatch',
};

export function ModelStatusView(props: ModelStatusViewProps) {
  const { headline, detail, depth, models, manifestVersion } = props;
  const complete = depth === 3;

  return (
    <>
      <Section>
        <Card style={{ gap: SPACING.md - 4, borderColor: complete ? COLORS.border : COLORS.severityEarly }}>
          <Row gap={SPACING.sm + 2} align="flex-start">
            <Icon
              name={complete ? 'check' : 'warning'}
              size={20}
              color={complete ? COLORS.healthy : COLORS.accent}
            />
            <Col gap={SPACING.xs} style={{ flex: 1 }}>
              <AppText variant="lg">{headline}</AppText>
              <AppText variant="sm" color={COLORS.textSecondary}>{detail}</AppText>
            </Col>
          </Row>
          <Divider />
          <Row gap={SPACING.xs + 2}>
            {STAGES.map(s => {
              const on = depth >= s.stage;
              return (
                <Tile
                  key={s.stage}
                  style={{ flex: 1, alignItems: 'center', gap: SPACING.xs, backgroundColor: on ? '#e6f2ec' : COLORS.surfaceAlt }}
                >
                  <AppText variant="xsSemi" color={on ? '#1f6146' : COLORS.textLight}>
                    STAGE {s.stage}
                  </AppText>
                  <Icon name={on ? 'check' : 'close'} size={16} color={on ? COLORS.healthy : COLORS.textLight} />
                  <AppText variant="xs" color={on ? '#1f6146' : COLORS.textLight}>{s.label}</AppText>
                </Tile>
              );
            })}
          </Row>
        </Card>
      </Section>

      <Section gap={SPACING.sm + 2}>
        <SectionHeader title="Models" meta={`${models.length} declared`} />
        {models.length === 0 ? (
          <Card>
            <Col gap={SPACING.xs}>
              <AppText variant="smSemi">No models declared</AppText>
              <AppText variant="xs" color={COLORS.textSecondary}>
                manifest.json lists no models, so no detection stage can run. Browsing, climate and
                the assistant still work.
              </AppText>
            </Col>
          </Card>
        ) : (
          <Col gap={SPACING.sm}>
            {models.map(model => (
              <Card key={model.id} style={{ gap: SPACING.sm, opacity: model.state === 'ready' ? 1 : 0.78 }}>
                <Row gap={SPACING.sm}>
                  <AppText variant="xsSemi" color={COLORS.textLight}>S{model.stage}</AppText>
                  <AppText variant="smSemi" style={{ flex: 1 }}>{model.id}</AppText>
                  <Chip label={STATE_LABEL[model.state]} dotColor={STATE_DOT[model.state]} />
                </Row>
                {model.state === 'ready' ? (
                  <>
                    <Divider />
                    <Row gap={SPACING.xs + 2} wrap>
                      {model.source ? <Chip label={model.source} tone="outline" /> : null}
                      {model.version ? <Chip label={`v${model.version}`} tone="outline" /> : null}
                      {model.verified ? (
                        <Chip label="checksum verified" icon="check" tone="outline" />
                      ) : (
                        <Chip label="not verified" tone="warning" />
                      )}
                    </Row>
                  </>
                ) : null}
                {model.note ? (
                  <>
                    <Divider />
                    <AppText variant="xs" color={COLORS.textSecondary}>{model.note}</AppText>
                  </>
                ) : null}
              </Card>
            ))}
          </Col>
        )}
      </Section>

      <Section gap={SPACING.sm + 2}>
        <Button label="Import a model file" icon="plus" variant="secondary" onPress={props.onImportModel} />
        <Tile>
          <Row gap={SPACING.sm} align="flex-start">
            <Icon name="info" size={16} color={COLORS.textSecondary} />
            <AppText variant="xs" color={COLORS.textSecondary} style={{ flex: 1 }}>
              Imported files load from device storage, which is unreliable on some Android builds.
              If loading fails the bundled model is used instead.
            </AppText>
          </Row>
        </Tile>
        <AppText variant="xs" color={COLORS.textLight} center>
          manifest_version {manifestVersion} · classes from ml/classes.json
        </AppText>
      </Section>
    </>
  );
}
