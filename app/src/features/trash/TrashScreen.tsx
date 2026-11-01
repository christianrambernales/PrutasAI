import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AppText,
  BtnForestFull,
  BtnSubtle,
  Button,
  Col,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
  RADIUS,
  Row,
  SPACING,
  useLanguage,
  useT,
} from '../../ui';
import type { ConversationSummary } from '../../core/db/repositories/conversations';
import { RETENTION_DAYS } from '../../core/sync/purgeTrash';
import type { Language } from '../../ui/i18n/strings';

export interface TrashItem {
  id: string;
  title: string;
  titleEn?: string;
  deletedDate?: string;
  deletedDateEn?: string;
  deletedDateFil?: string;
}

export interface TrashScreenProps {
  conversations?: ConversationSummary[];
  trashedItems?: TrashItem[];
  onRestore: (uuids: string[]) => Promise<void> | void;
  onDeleteForever?: (uuids: string[]) => Promise<void>;
  now?: () => Date;
  onBack?: () => void;
  language?: Language;
}

function daysLeft(deletedAt: string, now: Date): number {
  const elapsedMs = now.getTime() - new Date(deletedAt).getTime();
  const remaining = RETENTION_DAYS - Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

export function TrashScreen({
  conversations = [],
  trashedItems,
  onRestore,
  onDeleteForever,
  now = () => new Date(),
  onBack,
  language,
}: TrashScreenProps) {
  const t = useT();
  const contextLang = useLanguage();
  const currentLang = language ?? contextLang;
  const isFil = currentLang === 'FIL';

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(false);

  // Normalize items from either trashedItems or conversations
  const items = useMemo(() => {
    if (trashedItems && trashedItems.length > 0) {
      return trashedItems.map(it => ({
        id: it.id,
        title: (isFil && it.title) || it.titleEn || it.title,
        deletedDate: (isFil ? it.deletedDateFil : it.deletedDateEn) || it.deletedDate || (isFil ? 'Tinanggal kamakailan' : 'Recently deleted'),
      }));
    }
    return conversations.map(c => {
      const days = daysLeft(c.deletedAt ?? c.updatedAt, now());
      return {
        id: c.uuid,
        title: c.title,
        deletedDate: t.daysLeft(days),
      };
    });
  }, [trashedItems, conversations, isFil, now, t]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const targets = useMemo(
    () => items.filter(row => selected.has(row.id)).map(row => row.id),
    [items, selected],
  );

  const handleSingleRestore = async (id: string) => {
    if (restoring) return;
    setRestoring(true);
    setRestoreError(false);
    try {
      const maybePromise = onRestore([id]);
      if (maybePromise instanceof Promise) await maybePromise;
    } catch {
      setRestoreError(true);
    } finally {
      setRestoring(false);
    }
  };

  const handleBatchRestore = async () => {
    if (restoring || targets.length === 0) return;
    setRestoring(true);
    setRestoreError(false);
    try {
      const maybePromise = onRestore(targets);
      if (maybePromise instanceof Promise) await maybePromise;
      setSelected(new Set());
      setSelecting(false);
    } catch {
      setRestoreError(true);
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDeleteForever || targets.length === 0) return;
    setDeleting(true);
    setError(false);
    try {
      await onDeleteForever(targets);
      setConfirming(false);
      setSelected(new Set());
      setSelecting(false);
    } catch {
      setError(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirming(false);
    setError(false);
  };

  const backAction = (
    <BtnSubtle
      label={`← ${isFil ? 'Bumalik' : 'Back'}`}
      textColor="#ffffff"
      onPress={onBack}
      accessibilityLabel={t.goBack}
      style={styles.backBtn}
    />
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1:1 Prototype Green Top Cell */}
      <GreenTopCell
        title={isFil ? 'Basurahan (Trash)' : 'Trash Manager'}
        subtitle={isFil ? '15-Araw na soft-delete bago tuluyang burahin' : '15-Day retention policy before permanent purge'}
        rightAction={backAction}
      />

      {/* 1:1 Prototype Notice Card */}
      <FrostedCard surfaceColor="#fff5f5" style={styles.noticeCard}>
        <Text style={styles.noticeText}>
          {isFil
            ? 'Tandaan: Ang mga usapan lamang ang sakop ng soft-delete sa kasalukuyang sistema. Ang mga litrato ay permanenteng binubura kapag tinanggal sa history.'
            : 'Notice: Only chat conversations support soft-delete retention. Local photo captures are purged immediately when deleted.'}
        </Text>
      </FrostedCard>

      {/* Trashed Items List / Empty State */}
      {items.length === 0 ? (
        <FrostedCard style={styles.emptyCard}>
          <Text
            style={styles.emptyText}
            accessibilityRole="text"
            role="status"
            accessibilityLiveRegion="polite"
          >
            {isFil ? 'Walang laman ang basurahan.' : 'Trash is empty.'}
          </Text>
        </FrostedCard>
      ) : (
        <Col gap={SPACING.sm}>
          {/* Batch operations toolbar if multiple or selecting */}
          <Row gap={SPACING.sm}>
            <Button
              variant="secondary"
              label={selecting ? t.cancel : t.select}
              onPress={() => { setSelecting(s => !s); setSelected(new Set()); }}
            />
            {targets.length > 0 ? (
              <>
                <Button
                  label={restoreError ? t.retry : t.restore}
                  disabled={restoring}
                  onPress={() => void handleBatchRestore()}
                />
                {onDeleteForever ? (
                  <Button
                    variant="danger"
                    label={t.deleteForever}
                    onPress={() => setConfirming(true)}
                  />
                ) : null}
              </>
            ) : null}
          </Row>

          {restoreError ? (
            <AppText variant="sm" color={COLORS.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              {t.localErrorGeneric}
            </AppText>
          ) : null}

          <Col accessibilityRole="list" accessibilityLiveRegion="polite" gap={6}>
            {items.map(item => {
              const isSelected = selected.has(item.id);
              return (
                <FrostedCard
                  key={item.id}
                  style={[
                    styles.itemCard,
                    isSelected && styles.selectedItemCard,
                  ]}
                  onPress={() => {
                    if (selecting) { toggle(item.id); return; }
                    setSelected(new Set([item.id]));
                  }}
                  accessibilityLabel={`${item.title}, ${item.deletedDate}`}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemTitle, isSelected && styles.selectedItemTitle]}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemDate}>
                        {item.deletedDate}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${isFil ? 'Ibalik' : 'Restore'} ${item.title}`}
                      onPress={() => void handleSingleRestore(item.id)}
                      style={styles.restoreBtn}
                    >
                      <Text style={styles.restoreBtnText}>
                        {isFil ? 'Ibalik' : 'Restore'}
                      </Text>
                    </Pressable>
                  </View>
                </FrostedCard>
              );
            })}
          </Col>
        </Col>
      )}

      {/* 1:1 Prototype Bottom CTA */}
      <BtnForestFull
        label={`← ${isFil ? 'Bumalik sa Account' : 'Back to Account'}`}
        onPress={onBack}
        accessibilityLabel={`← ${isFil ? 'Bumalik sa Account' : 'Back to Account'}`}
        style={styles.bottomCta}
      />

      {/* Confirmation modal for permanent deletion */}
      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.scrim}>
          <View style={styles.modal} accessibilityViewIsModal>
            <Col gap={SPACING.md}>
              <AppText variant="lg" accessibilityRole="alert" accessibilityLiveRegion="polite">
                {t.trashDeleteConfirmTitle(targets.length)}
              </AppText>
              <AppText variant="sm">{t.trashDeleteConfirmBody}</AppText>
              {error ? (
                <AppText variant="sm" color={COLORS.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                  {t.localErrorGeneric}
                </AppText>
              ) : null}
              <Row gap={SPACING.sm} style={{ justifyContent: 'flex-end', marginTop: SPACING.sm }}>
                <Button variant="secondary" label={t.cancel} onPress={handleCancel} disabled={deleting} />
                <Button
                  variant="danger"
                  label={error ? t.retry : (deleting ? t.deleting : t.deleteForever)}
                  onPress={handleDeleteConfirm}
                  disabled={deleting}
                />
              </Row>
            </Col>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  backBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  noticeCard: {
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 14,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: '#991b1b',
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#64748b',
    paddingVertical: 12,
  },
  itemCard: {
    padding: 12,
  },
  selectedItemCard: {
    borderColor: '#154d2e',
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#1e293b',
  },
  selectedItemTitle: {
    color: '#154d2e',
  },
  itemDate: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#dc2626',
    marginTop: 2,
  },
  restoreBtn: {
    backgroundColor: '#eaf4ed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreBtnText: {
    color: '#154d2e',
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    fontSize: 13,
  },
  bottomCta: {
    marginTop: 8,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    elevation: 4,
  },
});
