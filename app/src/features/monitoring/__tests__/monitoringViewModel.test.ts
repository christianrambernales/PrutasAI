import { buildMonitoringView } from '../monitoringViewModel';
import type { MonitoringSession } from '../../../core/db/repositories/monitoring';
import type { StoredScan } from '../../../core/db/repositories/scans';

describe('monitoringViewModel', () => {
  const BASE_TIME = new Date('2026-09-22T00:00:00Z').getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const mockScan: StoredScan = {
    id: 'scan-1',
    imageUri: 'file:///photo.jpg',
    emoji: '🌱',
    title: 'Tomato',
    status: 'undetermined',
    detail: 'No disease model',
    timeLabel: 'Sep 22',
    accountId: null,
  };

  const createBaseSession = (): MonitoringSession => ({
    id: 'session-1',
    sourceScanId: 'scan-1',
    checkpoints: [
      {
        id: 'cp5',
        dayNumber: 5,
        scheduledDate: BASE_TIME + 4 * MS_PER_DAY,
        completedDate: null,
        observation: null,
        note: null,
        photoUri: null,
      },
      {
        id: 'cp10',
        dayNumber: 10,
        scheduledDate: BASE_TIME + 9 * MS_PER_DAY,
        completedDate: null,
        observation: null,
        note: null,
        photoUri: null,
      },
    ],
  });

  describe('buildMonitoringView', () => {
    it('returns Day 1 source scan baseline plus Day 5 and Day 10 checkpoints', () => {
      const session = createBaseSession();
      const view = buildMonitoringView(session, mockScan, BASE_TIME);
      
      expect(view.checkpoints).toHaveLength(3);
      expect(view.checkpoints[0].dayNumber).toBe(1);
      expect(view.checkpoints[1].dayNumber).toBe(5);
      expect(view.checkpoints[2].dayNumber).toBe(10);
    });

    it('derives scheduled dates from immutable baseline date', () => {
      const session = createBaseSession();
      const view = buildMonitoringView(session, mockScan, BASE_TIME);
      
      expect(view.checkpoints[1].scheduledDate).toBe(BASE_TIME + 4 * MS_PER_DAY);
      expect(view.checkpoints[2].scheduledDate).toBe(BASE_TIME + 9 * MS_PER_DAY);
    });

    it('identifies due checkpoints based on the current time', () => {
      const session = createBaseSession();
      // Fast forward to Day 5
      const now = BASE_TIME + 4 * MS_PER_DAY;
      const view = buildMonitoringView(session, mockScan, now);
      
      expect(view.checkpoints[1].status).toBe('due');
      expect(view.checkpoints[2].status).toBe('incomplete'); // Not due yet
    });

    it('identifies incomplete checkpoints that are past due', () => {
      const session = createBaseSession();
      // Fast forward to Day 6
      const now = BASE_TIME + 5 * MS_PER_DAY + 1000;
      const view = buildMonitoringView(session, mockScan, now);
      
      expect(view.checkpoints[1].status).toBe('incomplete');
    });

    it('identifies completed checkpoints', () => {
      const session = createBaseSession();
      session.checkpoints[0].completedDate = BASE_TIME + 4 * MS_PER_DAY;
      session.checkpoints[0].observation = 'better';
      
      const now = BASE_TIME + 4 * MS_PER_DAY;
      const view = buildMonitoringView(session, mockScan, now);
      
      expect(view.checkpoints[1].status).toBe('completed');
    });

    it('identifies completed_late when actual completion date is after scheduled date (both dates preserved)', () => {
      const session = createBaseSession();
      session.checkpoints[0].completedDate = BASE_TIME + 5 * MS_PER_DAY + 1000; // 1 day late
      session.checkpoints[0].observation = 'same';
      
      const now = BASE_TIME + 5 * MS_PER_DAY + 1000;
      const view = buildMonitoringView(session, mockScan, now);
      
      expect(view.checkpoints[1].status).toBe('completed_late');
      expect(view.checkpoints[1].scheduledDate).toBe(BASE_TIME + 4 * MS_PER_DAY);
      expect(view.checkpoints[1].completedDate).toBe(BASE_TIME + 5 * MS_PER_DAY + 1000);
    });

    it('detects missing fields (photo missing, note missing, observation needed)', () => {
      const session = createBaseSession();
      const view = buildMonitoringView(session, mockScan, BASE_TIME);
      
      // Before completing, observation is needed
      expect(view.checkpoints[1].missingFields).toContain('observation_needed');
      
      session.checkpoints[0].completedDate = BASE_TIME + 4 * MS_PER_DAY;
      session.checkpoints[0].observation = 'unsure';
      session.checkpoints[0].note = null;
      session.checkpoints[0].photoUri = null;
      
      const view2 = buildMonitoringView(session, mockScan, BASE_TIME + 4 * MS_PER_DAY);
      
      expect(view2.checkpoints[1].missingFields).toContain('photo_missing');
      expect(view2.checkpoints[1].missingFields).toContain('note_missing');
      expect(view2.checkpoints[1].missingFields).not.toContain('observation_needed');
    });

    it('supports all 4 observation self-report labels', () => {
      const session = createBaseSession();
      
      const labels: Array<'better' | 'same' | 'worse' | 'unsure'> = ['better', 'same', 'worse', 'unsure'];
      
      for (const label of labels) {
        session.checkpoints[0].observation = label;
        session.checkpoints[0].completedDate = BASE_TIME + 4 * MS_PER_DAY;
        const view = buildMonitoringView(session, mockScan, BASE_TIME + 4 * MS_PER_DAY);
        
        expect(view.checkpoints[1].observation).toBe(label);
      }
    });

    it('returns overall trend unavailable for 0, 1, or 2 checkpoint observations', () => {
      const session = createBaseSession();
      let view = buildMonitoringView(session, mockScan, BASE_TIME);
      expect(view.overallTrend).toBe('unavailable');
      
      session.checkpoints[0].completedDate = BASE_TIME + 4 * MS_PER_DAY;
      session.checkpoints[0].observation = 'better';
      view = buildMonitoringView(session, mockScan, BASE_TIME + 4 * MS_PER_DAY);
      expect(view.overallTrend).toBe('unavailable');
      
      session.checkpoints[1].completedDate = BASE_TIME + 9 * MS_PER_DAY;
      session.checkpoints[1].observation = 'worse';
      view = buildMonitoringView(session, mockScan, BASE_TIME + 9 * MS_PER_DAY);
      expect(view.overallTrend).toBe('unavailable');
    });

    it('prohibits fields like disease, severity, lesion percent, confidence, or chart trend in the output type', () => {
      const session = createBaseSession();
      const view = buildMonitoringView(session, mockScan, BASE_TIME);
      
      // We assert that these keys don't exist on the type or object
      expect((view as any).disease).toBeUndefined();
      expect((view as any).severity).toBeUndefined();
      expect((view as any).percent).toBeUndefined();
      expect((view as any).confidence).toBeUndefined();
      expect((view as any).chartTrend).toBeUndefined();
      
      // Also for checkpoints
      expect((view.checkpoints[0] as any).percent).toBeUndefined();
      expect((view.checkpoints[1] as any).percent).toBeUndefined();
    });
  });
});
