import React, { useState } from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import {
  AppText,
  BtnForestFull,
  BtnOutline,
  BtnSubtle,
  Button,
  Chip,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  RADIUS,
  SPACING,
  useLanguage,
  useT,
} from '../../ui';
import type { MonitoringCheckpointView, MonitoringMissingField } from '../viewModels';
import type { MonitoringController, Observation } from './useMonitoring';

export interface MonitoringScreenProps {
  controller?: MonitoringController;
  /** Kept temporarily for the shared screen smoke test during route migration. */
  session?: import('../viewModels').MonitoringView;
  expandedCheckpointDay?: number | null;
  onScanCheckpoint?: () => void;
  onOpenCheckpoint?: (day: number) => void;
  onCapturePhoto?: (day: 5 | 10) => void;

  // Standalone prototype v2 props (from recovery.html & brief test)
  checkpointTitle?: string;
  currentDay?: string;
  observationDate?: string;
  selectedObservation?: Observation | null;
  onSelectObservation?: (observation: Observation) => void;
  notes?: string;
  onChangeNotes?: (notes: string) => void;
  onSave?: () => void;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

function formatDate(value: number, language: 'EN' | 'FIL'): string {
  return new Date(value).toLocaleDateString(language === 'FIL' ? 'fil-PH' : 'en-US');
}

function dayLabel(dayNumber: number, t: ReturnType<typeof useT>): string {
  if (dayNumber === 1) return t.monitoringDay1;
  return dayNumber === 5 ? t.monitoringDay5 : t.monitoringDay10;
}

function statusLabel(checkpoint: MonitoringCheckpointView, t: ReturnType<typeof useT>): string {
  switch (checkpoint.status) {
    case 'completed_late': return t.monitoringCompletedLate;
    case 'completed': return t.monitoringCompleted;
    case 'incomplete': return t.monitoringIncomplete;
    default: return t.monitoringDue;
  }
}

function missingLabel(field: MonitoringMissingField, t: ReturnType<typeof useT>): string {
  switch (field) {
    case 'photo_missing': return t.missingPhoto;
    case 'note_missing': return t.missingNote;
    case 'observation_needed': return t.missingObservation;
  }
}

function observationLabel(observation: Observation | null, t: ReturnType<typeof useT>): string {
  switch (observation) {
    case 'better': return t.observationBetter;
    case 'same': return t.observationAboutSame;
    case 'worse': return t.observationWorse;
    case 'unsure': return t.observationUnsure;
    default: return t.monitoringNoObservation;
  }
}

function checkpointAccessibilityLabel(
  checkpoint: MonitoringCheckpointView,
  t: ReturnType<typeof useT>,
  language: 'EN' | 'FIL',
): string {
  const parts = [
    dayLabel(checkpoint.dayNumber, t),
    statusLabel(checkpoint, t),
    `${t.monitoringScheduled}: ${formatDate(checkpoint.scheduledDate, language)}`,
    `${t.monitoringObservationLabel}: ${observationLabel(checkpoint.observation, t)}`,
  ];
  if (checkpoint.missingFields.length > 0) {
    parts.push(`${t.monitoringMissingPrefix}: ${checkpoint.missingFields.map(field => missingLabel(field, t)).join(', ')}`);
  }
  if (checkpoint.completedDate !== null) {
    parts.push(`${t.monitoringActualCompletion}${formatDate(checkpoint.completedDate, language)}`);
  }
  return parts.join('. ');
}

/**
 * Screen 6: Checkpoint Observation & Session Timeline (recovery.html)
 * 1:1 Prototype Implementation with GreenTopCell, Timeline Progress FrostedCard,
 * and 2x2 Observation Choice Grid FrostedCard.
 */
export function MonitoringScreen({
  controller,
  session: legacySession,
  onScanCheckpoint,
  expandedCheckpointDay = null,
  onOpenCheckpoint = () => {},
  onCapturePhoto = () => {},
  checkpointTitle,
  currentDay,
  observationDate,
  selectedObservation,
  onSelectObservation,
  notes,
  onChangeNotes,
  onSave,
  onBack,
  style,
}: MonitoringScreenProps) {
  const t = useT();
  const language = useLanguage();
  const isFil = language === 'FIL';

  // Local state when uncontrolled
  const [internalObservation, setInternalObservation] = useState<Observation | null>(null);
  const [internalNotes, setInternalNotes] = useState<string>('');

  if (!controller && legacySession) {
    return <LegacyTimeline session={legacySession} onScanCheckpoint={onScanCheckpoint} />;
  }

  // Determine whether we are in Checkpoint Observation Mode
  const isDrafting = Boolean(controller?.draft);
  const isStandaloneCheckpoint =
    checkpointTitle !== undefined ||
    onSave !== undefined ||
    onSelectObservation !== undefined ||
    selectedObservation !== undefined ||
    currentDay !== undefined;

  const isCheckpointMode = isStandaloneCheckpoint || isDrafting;

  if (isCheckpointMode) {
    const draft = controller?.draft;
    const session = controller?.view;

    const displayTitle =
      checkpointTitle ??
      (session
        ? `${session.title} • ${isFil ? 'Araw' : 'Day'} ${draft?.dayNumber ?? 10} Checkpoint`
        : 'Mangga Carabao #042 • Day 10 Checkpoint');

    const displayCurrentDay =
      currentDay ??
      (isFil
        ? `Araw ${draft?.dayNumber ?? 10} (Ngayon)`
        : `Day ${draft?.dayNumber ?? 10} (Today)`);

    const draftCheckpoint = session?.checkpoints.find(c => c.dayNumber === draft?.dayNumber);
    const displayObsDate =
      observationDate ??
      (draftCheckpoint?.scheduledDate
        ? formatDate(draftCheckpoint.scheduledDate, language)
        : 'October 9, 2026');

    const activeObs =
      selectedObservation !== undefined
        ? selectedObservation
        : draft
        ? draft.observation
        : internalObservation;

    const activeNotes =
      notes !== undefined ? notes : draft ? draft.note : internalNotes;

    const handleSelectObs = (obs: Observation) => {
      setInternalObservation(obs);
      onSelectObservation?.(obs);
      controller?.setObservation(obs);
    };

    const handleNotesChange = (text: string) => {
      setInternalNotes(text);
      onChangeNotes?.(text);
      controller?.setNote(text);
    };

    const handleSave = () => {
      if (onSave) {
        onSave();
      } else if (controller) {
        void controller.save();
      }
    };

    const handleBack = () => {
      if (onBack) {
        onBack();
      } else if (controller) {
        void controller.requestBack();
      }
    };

    const observationChoices: Array<{
      value: Observation;
      label: string;
      emoji: string;
      accessibilityLabel: string;
    }> = [
      {
        value: 'better',
        label: isFil ? 'Mas Mabuti' : 'Better',
        emoji: '🌱',
        accessibilityLabel: t.observationBetter,
      },
      {
        value: 'same',
        label: isFil ? 'Kapareho Lang' : 'About Same',
        emoji: '⚖️',
        accessibilityLabel: t.observationAboutSame,
      },
      {
        value: 'worse',
        label: isFil ? 'Lumala' : 'Worse',
        emoji: '⚠️',
        accessibilityLabel: t.observationWorse,
      },
      {
        value: 'unsure',
        label: isFil ? 'Hindi Sigurado' : 'Unsure',
        emoji: '❓',
        accessibilityLabel: t.observationUnsure,
      },
    ];

    return (
      <View style={[styles.container, style]}>
        {/* 1. Green Top Cell Header */}
        <GreenTopCell
          title={isFil ? 'Pagtatala ng Obserbasyon' : 'Record Observation'}
          subtitle={displayTitle}
          rightAction={
            <BtnSubtle
              label={isFil ? '← Bumalik' : '← Back'}
              textColor="#ffffff"
              onPress={handleBack}
              style={styles.backPillButton}
              accessibilityLabel={isFil ? 'Bumalik' : 'Back'}
            />
          }
        />

        {/* 2. Timeline Progress FrostedCard */}
        <FrostedCard style={styles.cardSpacing}>
          <View style={styles.timelineRow}>
            <Text style={styles.timelineDayText}>
              {isFil ? 'Araw 1 (Baseline)' : 'Day 1 (Baseline)'}
            </Text>
            <Text style={styles.timelineDayText}>
              {isFil ? 'Araw 5' : 'Day 5'}
            </Text>
            <Text style={[styles.timelineDayText, styles.timelineDayToday]}>
              {displayCurrentDay}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.observationDateText}>
            {isFil ? 'Tunay na petsa ng pag-obserba: ' : 'Actual observation recorded on: '}
            {displayObsDate}
          </Text>
        </FrostedCard>

        {/* 3. Explicit User Choice (Plan MON-01: No preselection) */}
        <FrostedCard style={styles.cardSpacing}>
          <Text style={styles.formPromptLabel}>
            {isFil
              ? 'Kumusta ang kalagayan ng prutas/sugat ngayon?'
              : 'How has the fruit/lesion condition progressed?'}
          </Text>
          <Text style={styles.formPromptSublabel}>
            {isFil
              ? 'Pumili base sa iyong sariling pagmamasid sa taniman:'
              : 'Select based on your direct orchard inspection:'}
          </Text>

          {/* 2x2 Observation Choice Grid */}
          <View style={styles.observationGrid}>
            {observationChoices.map(opt => {
              const isSelected = activeObs === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityLabel={opt.accessibilityLabel}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelectObs(opt.value)}
                  style={({ pressed }) => [
                    styles.obsChoiceBtn,
                    isSelected ? styles.obsChoiceBtnSelected : styles.obsChoiceBtnUnselected,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.obsChoiceText,
                      isSelected ? styles.obsChoiceTextSelected : styles.obsChoiceTextUnselected,
                    ]}
                  >
                    {opt.emoji} {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Notes field */}
          <View style={styles.formGroup}>
            <Text style={styles.formFieldLabel}>
              {isFil ? 'Karagdagang Tala (Opsyonal)' : 'Notes / Field Observations (Optional)'}
            </Text>
            <TextInput
              accessibilityLabel={
                isFil ? 'Karagdagang Tala (Opsyonal)' : t.monitoringOptionalNote
              }
              value={activeNotes}
              onChangeText={handleNotesChange}
              multiline
              numberOfLines={2}
              style={styles.notesTextarea}
              placeholder={
                isFil
                  ? 'Hal. Natapos ang paggupit ng tuyong sanga...'
                  : 'E.g., Finished pruning canopy twigs...'
              }
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Optional Staged Photo in Controller Mode */}
          {draft ? (
            <View style={styles.photoSection}>
              <Text style={styles.formFieldLabel}>{t.monitoringOptionalPhoto}</Text>
              {draft.stagedPhotoUri ? (
                <Image
                  source={{ uri: draft.stagedPhotoUri }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                  accessible
                  accessibilityLabel={t.resultActionReviewPhoto}
                />
              ) : (
                <View style={styles.missingPhotoBox}>
                  <Icon name="camera" size={24} color="#94a3b8" />
                  <AppText variant="xs" color="#94a3b8">
                    {t.missingPhoto}
                  </AppText>
                </View>
              )}
              <View style={styles.photoButtonsRow}>
                <Button
                  label={draft.stagedPhotoUri ? t.monitoringReplacePhoto : t.monitoringAddPhoto}
                  variant="secondary"
                  icon="camera"
                  onPress={() => onCapturePhoto(draft.dayNumber as 5 | 10)}
                />
                {draft.stagedPhotoUri ? (
                  <Button
                    label={t.monitoringRemovePhoto}
                    variant="secondary"
                    onPress={() => void controller?.removeStagedPhoto()}
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Submit CTA */}
          <BtnForestFull
            label={isFil ? 'I-save ang Obserbasyon sa SQLite' : 'Save Observation to SQLite'}
            icon={<Icon name="check" size={18} color="#ffffff" />}
            accessibilityLabel={
              controller
                ? t.monitoringSaveObservation
                : isFil
                ? 'I-save ang Obserbasyon sa SQLite'
                : 'Save Observation to SQLite'
            }
            disabled={!activeObs || (controller ? controller.saving : false)}
            onPress={handleSave}
            style={{ marginTop: 10 }}
          />

          {/* Controller drafting extra actions */}
          {controller && isDrafting ? (
            <View style={{ marginTop: 8 }}>
              <Button
                label={t.monitoringBackToTimeline}
                variant="secondary"
                onPress={() => void controller.requestBack()}
              />
            </View>
          ) : null}
        </FrostedCard>

        {/* Error alert in controller drafting mode */}
        {controller?.error && draft ? (
          <FrostedCard style={styles.cardSpacing}>
            <AppText accessibilityRole="alert" variant="sm" color={COLORS.worsening}>
              {t.localErrorGeneric}
            </AppText>
            <View style={{ marginTop: 8 }}>
              <Button
                label={t.retry}
                disabled={controller.saving}
                onPress={() => void controller.save()}
              />
            </View>
          </FrostedCard>
        ) : null}

        {/* Dirty draft discard confirmation dialog */}
        {controller?.discardConfirmationVisible ? (
          <FrostedCard style={styles.discardCard}>
            <AppText variant="smSemi">{t.monitoringDiscardDraftTitle}</AppText>
            <AppText variant="xs" color="#64748b">
              {t.monitoringDiscardDraftDetail}
            </AppText>
            <View style={styles.discardButtonsRow}>
              <Button
                label={t.monitoringKeepEditing}
                variant="secondary"
                onPress={controller.cancelDiscard}
              />
              <Button
                label={t.monitoringDiscardDraft}
                variant="danger"
                onPress={() => void controller.discard()}
              />
            </View>
          </FrostedCard>
        ) : null}
      </View>
    );
  }

  // =========================================================================
  // Controller Session Timeline Overview Mode (draft is null)
  // =========================================================================
  if (!controller) return null;

  const { view: session, loading, error } = controller;

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <FrostedCard style={styles.cardSpacing}>
          <AppText accessibilityLiveRegion="polite" variant="mdSemi">
            {t.historyLoading}
          </AppText>
        </FrostedCard>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, style]}>
        <FrostedCard style={styles.cardSpacing}>
          <AppText variant="mdSemi">{t.monitoringLoadError}</AppText>
          <AppText variant="sm" color="#64748b">
            {t.localErrorGeneric}
          </AppText>
          <Button label={t.retry} onPress={() => void controller.reload()} />
        </FrostedCard>
      </View>
    );
  }

  const completedCount = session.checkpoints.filter(
    cp => cp.status === 'completed' || cp.status === 'completed_late',
  ).length;
  const totalCount = session.checkpoints.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const latestCompleted = [...session.checkpoints].reverse().find(cp => cp.completedDate !== null);

  return (
    <View style={[styles.container, style]}>
      {/* 1. GreenTopCell Header */}
      <GreenTopCell
        title={session.title}
        subtitle={t.monitoringTimeline}
        rightAction={
          onBack ? (
            <BtnSubtle
              label={isFil ? '← Bumalik' : '← Back'}
              textColor="#ffffff"
              onPress={onBack}
              style={styles.backPillButton}
              accessibilityLabel={isFil ? 'Bumalik' : 'Back'}
            />
          ) : undefined
        }
      />

      {/* 2. Timeline Progress FrostedCard */}
      <FrostedCard style={styles.cardSpacing}>
        <View style={styles.timelineRow}>
          <Text style={styles.timelineDayText}>
            {dayLabel(1, t)} ({t.monitoringBaseline})
          </Text>
          <Text style={styles.timelineDayText}>{dayLabel(5, t)}</Text>
          <Text
            style={[
              styles.timelineDayText,
              session.checkpoints.find(c => c.dayNumber === 10)?.status === 'due'
                ? styles.timelineDayToday
                : null,
            ]}
          >
            {dayLabel(10, t)}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        {latestCompleted?.completedDate ? (
          <Text style={styles.observationDateText}>
            {t.monitoringActualCompletion}
            {formatDate(latestCompleted.completedDate, language)}
          </Text>
        ) : null}
      </FrostedCard>

      {/* 3. Overall Trend Unavailable Card */}
      <FrostedCard style={styles.cardSpacing}>
        <View style={styles.trendRow}>
          <Icon name="info" size={16} color="#0369a1" />
          <AppText variant="mdSemi" color="#475569">
            {t.trendUnavailable}
          </AppText>
        </View>
        <AppText variant="xs" color="#64748b">
          {t.monitoringTrendReason}
        </AppText>
      </FrostedCard>

      {/* 4. Checkpoints Section */}
      <View style={styles.checkpointsSection}>
        <AppText variant="mdSemi" accessibilityRole="header">
          {t.monitoringCheckpoints}
        </AppText>
        {session.checkpoints.map(checkpoint => {
          const isDayOne = checkpoint.dayNumber === 1;
          const isDone =
            checkpoint.status === 'completed' || checkpoint.status === 'completed_late';
          const checkpointDayLabel = dayLabel(checkpoint.dayNumber, t);

          return (
            <FrostedCard key={checkpoint.id} style={styles.checkpointCard}>
              <View style={styles.checkpointHeaderRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="mdSemi">{checkpointDayLabel}</AppText>
                  <AppText variant="xs" color="#64748b">
                    {isDayOne
                      ? `${t.monitoringBaseline} · ${formatDate(checkpoint.scheduledDate, language)}`
                      : `${t.monitoringScheduled}: ${formatDate(checkpoint.scheduledDate, language)}`}
                  </AppText>
                </View>
                <Chip
                  label={isDayOne ? t.monitoringBaseline : statusLabel(checkpoint, t)}
                  tone={checkpoint.status === 'completed_late' ? 'warning' : isDone ? 'solid' : 'outline'}
                />
              </View>

              {isDayOne ? <Baseline checkpoint={checkpoint} language={language} /> : null}

              {!isDayOne && checkpoint.missingFields.length > 0 ? (
                <AppText variant="xs" color={COLORS.worsening}>
                  {t.monitoringMissingPrefix}:{' '}
                  {checkpoint.missingFields.map(field => missingLabel(field, t)).join(', ')}
                </AppText>
              ) : null}

              {!isDayOne && !isDone ? (
                <AppText variant="xs" color="#64748b">
                  {t.monitoringObservationLabel}: {observationLabel(checkpoint.observation, t)}
                </AppText>
              ) : null}

              {!isDayOne && isDone ? (
                <CompletedCheckpoint
                  checkpoint={checkpoint}
                  expanded={expandedCheckpointDay === checkpoint.dayNumber}
                  accessibilityLabel={checkpointAccessibilityLabel(checkpoint, t, language)}
                  onOpen={() => onOpenCheckpoint(checkpoint.dayNumber)}
                  language={language}
                />
              ) : null}

              {!isDayOne && !isDone ? (
                <Button
                  label={`${checkpointDayLabel}: ${t.monitoringCompleteCheckpoint}`}
                  icon="camera"
                  onPress={() => controller.beginCheckpoint(checkpoint.dayNumber as 5 | 10)}
                />
              ) : null}
            </FrostedCard>
          );
        })}
      </View>

      {error ? (
        <FrostedCard style={styles.cardSpacing}>
          <AppText accessibilityRole="alert" variant="sm" color={COLORS.worsening}>
            {t.localErrorGeneric}
          </AppText>
          <View style={{ marginTop: 8 }}>
            <Button label={t.retry} onPress={() => void controller.reload()} />
          </View>
        </FrostedCard>
      ) : null}
    </View>
  );
}

function LegacyTimeline({
  session,
  onScanCheckpoint,
}: {
  session?: import('../viewModels').MonitoringView;
  onScanCheckpoint?: () => void;
}) {
  if (!session) return null;
  return (
    <View style={styles.container}>
      <FrostedCard style={styles.cardSpacing}>
        <AppText variant="mdSemi">{session.title}</AppText>
        {session.checkpoints.map(checkpoint => (
          <View key={checkpoint.id} style={{ gap: 4, marginTop: 8 }}>
            <AppText variant="smSemi">Day {checkpoint.dayNumber}</AppText>
            {checkpoint.dayNumber > 1 && checkpoint.observation === null ? (
              <Button label="Scan checkpoint" onPress={onScanCheckpoint} />
            ) : null}
          </View>
        ))}
      </FrostedCard>
    </View>
  );
}

function Baseline({
  checkpoint,
  language,
}: {
  checkpoint: MonitoringCheckpointView;
  language: 'EN' | 'FIL';
}) {
  const t = useT();
  return (
    <View style={styles.baselineBox}>
      {checkpoint.photoUri ? (
        <Image
          source={{ uri: checkpoint.photoUri }}
          style={styles.photoPreview}
          resizeMode="cover"
          accessible
          accessibilityLabel={t.resultActionReviewPhoto}
        />
      ) : null}
      <AppText variant="xs" color="#64748b">
        {t.monitoringBaseline} · {formatDate(checkpoint.scheduledDate, language)}
      </AppText>
    </View>
  );
}

function CompletedCheckpoint({
  checkpoint,
  expanded,
  accessibilityLabel,
  onOpen,
  language,
}: {
  checkpoint: MonitoringCheckpointView;
  expanded: boolean;
  accessibilityLabel: string;
  onOpen: () => void;
  language: 'EN' | 'FIL';
}) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded }}
      onPress={onOpen}
      style={({ pressed }) => [styles.completedPressable, { opacity: pressed ? 0.82 : 1 }]}
    >
      <View style={styles.completedInner}>
        <View style={styles.checkpointHeaderRow}>
          <AppText variant="smSemi">
            {t.monitoringObservationLabel}: {observationLabel(checkpoint.observation, t)}
          </AppText>
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <Icon name="chevronDown" size={16} color="#64748b" />
          </View>
        </View>
        {checkpoint.note ? (
          <AppText variant="xs" color="#64748b">
            {checkpoint.note}
          </AppText>
        ) : null}
        {checkpoint.completedDate ? (
          <AppText
            variant="xs"
            color={checkpoint.status === 'completed_late' ? COLORS.warningText : '#64748b'}
          >
            {t.monitoringActualCompletion}
            {formatDate(checkpoint.completedDate, language)}
          </AppText>
        ) : null}
        {expanded && checkpoint.photoUri ? (
          <Image
            source={{ uri: checkpoint.photoUri }}
            style={styles.photoPreview}
            resizeMode="cover"
            accessible
            accessibilityLabel={t.resultActionReviewPhoto}
          />
        ) : null}
        {expanded && !checkpoint.photoUri ? (
          <AppText variant="xs" color="#94a3b8">
            {t.missingPhoto}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f2f6f3',
    padding: 14,
    gap: 12,
  },
  backPillButton: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSpacing: {
    padding: 14,
    gap: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineDayText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#64748b',
  },
  timelineDayToday: {
    color: '#c2410c',
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#154d2e',
    borderRadius: 3,
  },
  observationDateText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#64748b',
    marginTop: 6,
  },
  formPromptLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#0f172a',
  },
  formPromptSublabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748b',
    marginBottom: 6,
  },
  observationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  obsChoiceBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  obsChoiceBtnUnselected: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  obsChoiceBtnSelected: {
    borderWidth: 1.5,
    borderColor: '#154d2e',
    backgroundColor: '#ecfdf5',
    shadowColor: 'rgba(21, 77, 46, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  obsChoiceText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  obsChoiceTextUnselected: {
    color: '#0f172a',
  },
  obsChoiceTextSelected: {
    color: '#154d2e',
  },
  formGroup: {
    marginTop: 10,
    gap: 4,
  },
  formFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: '#0f172a',
  },
  notesTextarea: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  photoSection: {
    marginTop: 10,
    gap: 6,
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  missingPhotoBox: {
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  discardCard: {
    backgroundColor: '#f8fafc',
    gap: 8,
    padding: 12,
  },
  discardButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkpointsSection: {
    gap: 10,
  },
  checkpointCard: {
    padding: 12,
    gap: 8,
  },
  checkpointHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  baselineBox: {
    gap: 6,
    paddingTop: 4,
  },
  completedPressable: {
    minHeight: 48,
    justifyContent: 'center',
  },
  completedInner: {
    gap: 6,
  },
});
