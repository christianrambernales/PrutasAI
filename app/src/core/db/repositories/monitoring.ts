import { SqlDriver } from '../driver';
import { LocalAccountScope } from '../../auth/scope';

export interface MonitoringCheckpoint {
  id: string;
  dayNumber: number;
  scheduledDate: number;
  completedDate: number | null;
  observation: 'better' | 'same' | 'worse' | 'unsure' | null;
  note: string | null;
  photoUri: string | null;
}

export interface MonitoringSession {
  id: string;
  sourceScanId: string;
  checkpoints: MonitoringCheckpoint[];
}

export async function createMonitoringSession(
  db: SqlDriver,
  sourceScanId: string,
  scope: LocalAccountScope,
  baseDate?: number
): Promise<MonitoringSession> {
  throw new Error('Not implemented');
}

export async function getMonitoringSession(
  db: SqlDriver,
  sessionId: string,
  scope: LocalAccountScope
): Promise<MonitoringSession | null> {
  throw new Error('Not implemented');
}

export async function getMonitoringSessionForScan(
  db: SqlDriver,
  sourceScanId: string,
  scope: LocalAccountScope
): Promise<MonitoringSession | null> {
  throw new Error('Not implemented');
}

export async function listMonitoringSessions(
  db: SqlDriver,
  scope: LocalAccountScope
): Promise<MonitoringSession[]> {
  throw new Error('Not implemented');
}

export async function completeCheckpoint(
  db: SqlDriver,
  sessionId: string,
  dayNumber: number,
  update: { observation: string; note?: string; photoUri?: string },
  scope: LocalAccountScope
): Promise<MonitoringSession> {
  throw new Error('Not implemented');
}
