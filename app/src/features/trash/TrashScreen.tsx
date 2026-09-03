import React, { useMemo, useState } from 'react';
import { AppText, Button, Col, COLORS, PressableRow, Row, Section, SPACING, useT } from '../../ui';
import type { ConversationSummary } from '../../core/db/repositories/conversations';

export interface TrashScreenProps {
  conversations: ConversationSummary[];
  onRestore: (uuids: string[]) => void;
  onDeleteForever: (uuids: string[]) => void;
  now?: () => Date;
}

const RETENTION_DAYS = 15;

function daysLeft(deletedAt: string, now: Date): number {
  const elapsedMs = now.getTime() - new Date(deletedAt).getTime();
  const remaining = RETENTION_DAYS - Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

export function TrashScreen({ conversations, onRestore, onDeleteForever, now = () => new Date() }: TrashScreenProps) {
  const t = useT();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (uuid: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  };

  const targets = useMemo(
    () => (selected.size > 0 ? [...selected] : []),
    [selected],
  );

  if (conversations.length === 0) {
    return (
      <Section gap={SPACING.md}>
        <AppText variant="sm" color={COLORS.textSecondary}>{t.trashEmpty}</AppText>
      </Section>
    );
  }

  return (
    <Section gap={SPACING.md}>
      <Row gap={SPACING.sm}>
        <Button
          variant="secondary"
          label={t.select}
          onPress={() => { setSelecting(s => !s); setSelected(new Set()); }}
        />
        {targets.length > 0 ? (
          <>
            <Button label={t.restore} onPress={() => onRestore(targets)} />
            <Button variant="danger" label={t.deleteForever} onPress={() => onDeleteForever(targets)} />
          </>
        ) : null}
      </Row>

      <Col gap={SPACING.xs}>
        {conversations.map(c => (
          <PressableRow
            key={c.uuid}
            selected={selected.has(c.uuid)}
            onPress={() => {
              if (selecting) { toggle(c.uuid); return; }
              // Acting on a single, unselected row offers the same two actions individually.
              setSelected(new Set([c.uuid]));
            }}
          >
            <Col gap={2} style={{ flex: 1 }}>
              <AppText variant="sm" color={selected.has(c.uuid) ? COLORS.primary : COLORS.text}>
                {c.title}
              </AppText>
              <AppText variant="xs" color={COLORS.textLight}>
                {t.daysLeft(daysLeft(c.deletedAt ?? c.updatedAt, now()))}
              </AppText>
            </Col>
          </PressableRow>
        ))}
      </Col>
    </Section>
  );
}
