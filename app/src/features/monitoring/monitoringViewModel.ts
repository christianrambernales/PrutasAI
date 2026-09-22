import type { MonitoringSession } from '../../core/db/repositories/monitoring';
import type { StoredScan } from '../../core/db/repositories/scans';
import type { MonitoringView, MonitoringCheckpointView, MonitoringCheckpointStatus, MonitoringMissingField } from '../viewModels';

export function buildMonitoringView(
  session: MonitoringSession,
  sourceScan: StoredScan,
  now: number = Date.now()
): MonitoringView {
  // Map Day 1
  const day1Date = session.checkpoints.length > 0 
    ? session.checkpoints[0].scheduledDate - (session.checkpoints[0].dayNumber - 1) * 86400000 
    : now;

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
    let status: MonitoringCheckpointStatus = 'due';
    
    if (cp.completedDate) {
      if (cp.completedDate > cp.scheduledDate) {
        status = 'completed_late';
      } else {
        status = 'completed';
      }
    } else if (now >= cp.scheduledDate) { // Or maybe now > scheduledDate + some grace period? tests say "Day 6" for "incomplete"
      // Wait, test says: "now = BASE_TIME + 5 * MS_PER_DAY + 1000", scheduled for Day 5 is BASE + 4 days, so it is well past due.
      if (now > cp.scheduledDate) {
         status = 'incomplete';
      }
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
