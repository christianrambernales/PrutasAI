import type { MonitoringSession } from '../../core/db/repositories/monitoring';
import type { StoredScan } from '../../core/db/repositories/scans';
import type { MonitoringView, MonitoringCheckpointView, MonitoringCheckpointStatus, MonitoringMissingField } from '../viewModels';

export function buildMonitoringView(
  session: MonitoringSession,
  sourceScan: StoredScan,
  now: number = Date.now()
): MonitoringView {
  // Day 1 is the persisted scan timestamp. Do not reverse-engineer it from a
  // later slot: a repaired/migrated session must retain the original baseline.
  const day1Date = session.sourceCreatedAt;
  const day1: MonitoringCheckpointView = {
    id: `base-${sourceScan.id}`,
    dayNumber: 1,
    scheduledDate: day1Date,
    completedDate: day1Date,
    status: 'completed',
    missingFields: [],
    observation: null, // Day 1 doesn't have an observation
    note: null,
    photoUri: sourceScan.imageUri,
  };

  const laterCheckpoints = session.checkpoints.map(cp => {
    // A scheduled slot is due through its calendar instant. Once that instant
    // has passed without a self-report it is incomplete; we do not infer any
    // agricultural change from either state.
    let status: MonitoringCheckpointStatus = 'due';
    if (cp.completedDate) {
      if (cp.completedDate > cp.scheduledDate) {
        status = 'completed_late';
      } else {
        status = 'completed';
      }
    } else if (now > cp.scheduledDate) {
      status = 'incomplete';
    }

    // missing fields
    const missingFields: MonitoringMissingField[] = [];
    if (!cp.completedDate) {
      missingFields.push('observation_needed');
    } else {
      if (!cp.photoUri) missingFields.push('photo_missing');
      if (!cp.note) missingFields.push('note_missing');
    }

    return {
      id: cp.id,
      dayNumber: cp.dayNumber,
      scheduledDate: cp.scheduledDate,
      completedDate: cp.completedDate,
      status,
      missingFields,
      observation: cp.observation,
      note: cp.note,
      photoUri: cp.photoUri,
    };
  });

  return {
    id: session.id,
    emoji: sourceScan.emoji,
    title: sourceScan.title,
    overallTrend: 'unavailable',
    checkpoints: [day1, ...laterCheckpoints],
  };
}
