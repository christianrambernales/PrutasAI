import { useCallback, useEffect, useState } from 'react';
import type { PhotoStore } from '../../core/files/photoStore';
import type { SqlDriver } from '../../core/db/driver';
import { findScan, type LocalAccountScope } from '../../core/db/repositories/scans';
import {
  completeCheckpoint,
  createMonitoringSession,
} from '../../core/db/repositories/monitoring';
import type { MonitoringView } from '../viewModels';
import { buildMonitoringView } from './monitoringViewModel';

export type Observation = 'better' | 'same' | 'worse' | 'unsure';

export interface CheckpointDraft {
  dayNumber: 5 | 10;
  observation: Observation | null;
  note: string;
  /** An app-owned copy which has not been written to a checkpoint yet. */
  stagedPhotoUri: string | null;
}

export interface UseMonitoringInput {
  db: SqlDriver;
  scope: LocalAccountScope;
  /** Source scan ID carried by the monitoring route. */
  sessionId: string | null;
  photoStore: PhotoStore;
  bumpData: () => void;
}

export interface MonitoringController {
  view: MonitoringView | null;
  loading: boolean;
  error: boolean;
  saving: boolean;
  draft: CheckpointDraft | null;
  discardConfirmationVisible: boolean;
  hasUnsavedChanges: boolean;
  reload: () => Promise<void>;
  beginCheckpoint: (dayNumber: 5 | 10) => void;
  setObservation: (observation: Observation) => void;
  setNote: (note: string) => void;
  /** Takes ownership of a route-returned, app-owned capture. */
  acceptStagedPhoto: (dayNumber: 5 | 10, uri: string) => Promise<void>;
  removeStagedPhoto: () => Promise<boolean>;
  save: () => Promise<boolean>;
  requestBack: () => Promise<boolean>;
  cancelDiscard: () => void;
  discard: () => Promise<boolean>;
}

const OBSERVATIONS: ReadonlySet<string> = new Set(['better', 'same', 'worse', 'unsure']);

function isDirty(draft: CheckpointDraft | null): boolean {
  return draft !== null && (
    draft.observation !== null || draft.note.trim().length > 0 || draft.stagedPhotoUri !== null
  );
}

/**
 * Owns the local checkpoint draft. A photo is only deleted while it remains
 * uncommitted: a successful repository write transfers ownership to SQLite.
 */
export function useMonitoring({
  db,
  scope,
  sessionId,
  photoStore,
  bumpData,
}: UseMonitoringInput): MonitoringController {
  const [view, setView] = useState<MonitoringView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CheckpointDraft | null>(null);
  const [discardConfirmationVisible, setDiscardConfirmationVisible] = useState(false);

  const reload = useCallback(async () => {
    if (!sessionId) { setView(null); setLoading(false); return; }
    setLoading(true);
    setError(false);
    try {
      const session = await createMonitoringSession(db, sessionId, scope);
      const source = findScan(db, session.sourceScanId, scope);
      if (!source) throw new Error('Monitoring source scan is unavailable');
      setView(buildMonitoringView(session, source));
    } catch {
      setView(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [db, scope, sessionId]);

  useEffect(() => {
    setDraft(null);
    setDiscardConfirmationVisible(false);
    void reload();
  }, [reload]);

  const beginCheckpoint = useCallback((dayNumber: 5 | 10) => {
    setError(false);
    setDiscardConfirmationVisible(false);
    setDraft(current => current?.dayNumber === dayNumber ? current : {
      dayNumber,
      observation: null,
      note: '',
      stagedPhotoUri: null,
    });
  }, []);

  const setObservation = useCallback((observation: Observation) => {
    if (!OBSERVATIONS.has(observation)) return;
    setDraft(current => current ? { ...current, observation } : current);
  }, []);

  const setNote = useCallback((note: string) => {
    setDraft(current => current ? { ...current, note } : current);
  }, []);

  const acceptStagedPhoto = useCallback(async (dayNumber: 5 | 10, uri: string) => {
    const replacedUri = draft?.dayNumber === dayNumber && draft.stagedPhotoUri !== uri
      ? draft.stagedPhotoUri
      : null;
    setDraft(current => current?.dayNumber === dayNumber
      ? { ...current, stagedPhotoUri: uri }
      : { dayNumber, observation: null, note: '', stagedPhotoUri: uri });

    // The new URI is already live in the retained draft before cleanup starts.
    // A cleanup failure cannot invalidate that draft or expose the URI.
    if (replacedUri) {
      try {
        await photoStore.deleteOwned(replacedUri);
      } catch {
        setError(true);
      }
    }
  }, [draft, photoStore]);

  const save = useCallback(async () => {
    if (!draft || !view || !draft.observation || !OBSERVATIONS.has(draft.observation) || saving) return false;
    setSaving(true);
    setError(false);
    try {
      await completeCheckpoint(
        db,
        view.id,
        draft.dayNumber,
        {
          observation: draft.observation,
          note: draft.note.trim() || undefined,
          photoUri: draft.stagedPhotoUri || undefined,
        },
        scope,
      );
      // The repository row now owns the URI. Do not delete it when clearing the
      // form; the same URI must be shown as the completed checkpoint photo.
      setDraft(null);
      bumpData();
      await reload();
      return true;
    } catch {
      // Retain the full draft and its live staged URI for an explicit retry.
      setError(true);
      return false;
    } finally {
      setSaving(false);
    }
  }, [bumpData, db, draft, reload, saving, scope, view]);

  const removeStagedPhoto = useCallback(async () => {
    if (!draft?.stagedPhotoUri) return true;
    try {
      await photoStore.deleteOwned(draft.stagedPhotoUri);
      setDraft(current => current ? { ...current, stagedPhotoUri: null } : current);
      return true;
    } catch {
      setError(true);
      return false;
    }
  }, [draft, photoStore]);

  const requestBack = useCallback(async () => {
    if (!isDirty(draft)) {
      setDraft(null);
      return true;
    }
    setDiscardConfirmationVisible(true);
    return false;
  }, [draft]);

  const cancelDiscard = useCallback(() => setDiscardConfirmationVisible(false), []);

  const discard = useCallback(async () => {
    if (!draft) return true;
    if (draft.stagedPhotoUri) {
      try {
        await photoStore.deleteOwned(draft.stagedPhotoUri);
      } catch {
        // Keeping the draft is safer than leaving it pointed at a file we may
        // have failed to clean up. The user can retry the confirmed discard.
        setError(true);
        return false;
      }
    }
    setDiscardConfirmationVisible(false);
    setDraft(null);
    return true;
  }, [draft, photoStore]);

  return {
    view, loading, error, saving, draft, discardConfirmationVisible,
    hasUnsavedChanges: isDirty(draft),
    reload, beginCheckpoint, setObservation, setNote, acceptStagedPhoto, removeStagedPhoto,
    save, requestBack, cancelDiscard, discard,
  };
}
