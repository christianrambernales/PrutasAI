import React, { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import {
  AppText,
  BtnForestFull,
  BtnSubtle,
  Button,
  COLORS,
  FONTS,
  FrostedCard,
  GreenTopCell,
  Icon,
  useLanguage,
  useT,
} from '../../ui';
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

/**
 * Screen 6: Checkpoint Observation & Session Timeline (recovery.html)
 * 1:1 Prototype Implementation with GreenTopCell, Timeline Progress FrostedCard,
 * and 2x2 Observation Choice Grid FrostedCard.
 */
export function MonitoringScreen({
  controller,
  session: legacySession,
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

  const draft = controller?.draft ?? null;
  const session = controller?.view ?? legacySession ?? null;
  const uncompletedCp = session?.checkpoints?.find(
    c => (c.dayNumber === 5 || c.dayNumber === 10) && c.completedDate === null,
  );
  const targetDay: 5 | 10 =
    draft?.dayNumber ?? (uncompletedCp?.dayNumber === 5 ? 5 : 10);

  useEffect(() => {
    if (controller && controller.view && controller.draft === null) {
      controller.beginCheckpoint(targetDay);
    }
  }, [controller, targetDay]);

  const sessionTitle =
    session?.title || (session as { scanTitle?: string } | null)?.scanTitle;

  const displayTitle =
    checkpointTitle ??
    (sessionTitle
      ? `${sessionTitle} • ${isFil ? 'Araw' : 'Day'} ${targetDay} Checkpoint`
      : isFil
      ? 'Mangga Carabao #042 • Araw 10 Checkpoint'
      : 'Mangga Carabao #042 • Day 10 Checkpoint');

  const displayCurrentDay =
    currentDay ??
    (isFil ? 'Araw 10 (Ngayon)' : 'Day 10 (Today)');

  const draftCheckpoint =
    session?.checkpoints?.find(c => c.dayNumber === targetDay) ??
    session?.checkpoints?.[session.checkpoints.length - 1];
  const displayObsDate =
    observationDate ??
    (draftCheckpoint?.scheduledDate
      ? formatDate(draftCheckpoint.scheduledDate, language)
      : isFil
      ? 'Oktubre 9, 2026'
      : 'October 9, 2026');

  const activeObs =
    selectedObservation !== undefined
      ? selectedObservation
      : draft?.observation ?? internalObservation;

  const activeNotes =
    notes !== undefined ? notes : draft?.note ?? internalNotes;

  const handleSelectObs = (obs: Observation) => {
    setInternalObservation(obs);
    onSelectObservation?.(obs);
    if (controller) {
      if (!controller.draft) {
        controller.beginCheckpoint(targetDay);
      }
      controller.setObservation(obs);
    }
  };

  const handleNotesChange = (text: string) => {
    setInternalNotes(text);
    onChangeNotes?.(text);
    if (controller) {
      if (!controller.draft) {
        controller.beginCheckpoint(targetDay);
      }
      controller.setNote(text);
    }
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
      </FrostedCard>

      {/* Error alert in controller mode */}
      {controller?.error ? (
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
  discardCard: {
    backgroundColor: '#f8fafc',
    gap: 8,
    padding: 12,
  },
  discardButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
