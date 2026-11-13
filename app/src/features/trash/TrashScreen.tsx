import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AppText,
  BtnForestFull,
  BtnSubtle,
  Col,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
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
  now = () => new Date(),
  onBack,
  language,
}: TrashScreenProps) {
  const t = useT();
  const contextLang = useLanguage();
  const currentLang = language ?? contextLang;
  const isFil = currentLang === 'FIL';

  const [restoring, setRestoring] = useState(false);
  const [failedRestoreId, setFailedRestoreId] = useState<string | null>(null);

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

  const handleSingleRestore = async (id: string) => {
    if (restoring) return;
    setRestoring(true);
    setFailedRestoreId(null);
    try {
      const maybePromise = onRestore([id]);
      if (maybePromise instanceof Promise) await maybePromise;
    } catch {
      setFailedRestoreId(id);
    } finally {
      setRestoring(false);
    }
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
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
          {failedRestoreId ? (
            <AppText variant="sm" color={COLORS.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              {t.localErrorGeneric}
            </AppText>
          ) : null}

          <Col accessibilityRole="list" accessibilityLiveRegion="polite" gap={6}>
            {items.map(item => {
              const hasFailed = failedRestoreId === item.id;
              return (
                <FrostedCard key={item.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemDate}>
                        {item.deletedDate}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={hasFailed ? t.retry : `${isFil ? 'Ibalik' : 'Restore'} ${item.title}`}
                      onPress={() => void handleSingleRestore(item.id)}
                      disabled={restoring}
                      style={styles.restoreBtn}
                    >
                      <Text style={styles.restoreBtnText}>
                        {hasFailed ? t.retry : (isFil ? 'Ibalik' : 'Restore')}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f2f6f3',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f2f6f3',
    paddingTop: 14,
    paddingHorizontal: 15,
    paddingBottom: 20,
    gap: 14,
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
});
