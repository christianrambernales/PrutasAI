import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonitoringListScreen, type MonitoringListScreenProps } from '../MonitoringListScreen';
import type { MonitoringListRow } from '../useMonitoringList';
import { LanguageProvider, strings } from '../../../ui';

const row: MonitoringListRow = {
  id: 'session-a', sourceScanId: 'scan-a',
  source: { id: 'scan-a', title: 'Mango', emoji: '🥭', status: 'undetermined', detail: '', timeLabel: '',
    fruitNameEn: 'Mango', fruitNameFil: 'Mangga', createdAtIso: '2026-10-01T00:00:00Z' },
  checkpoints: [
    { id: 'cp5', dayNumber: 5, scheduledDate: Date.UTC(2026, 9, 5), completedDate: Date.UTC(2026, 9, 7), observation: 'same', note: null, photoUri: null },
    { id: 'cp10', dayNumber: 10, scheduledDate: Date.UTC(2026, 9, 10), completedDate: null, observation: null, note: null, photoUri: null },
  ],
};
const props = (overrides: Partial<MonitoringListScreenProps> = {}): MonitoringListScreenProps => ({
  rows: [], loading: false, error: false, onRetry: jest.fn(), onOpen: jest.fn(),
  onScan: jest.fn(), onOpenHistory: jest.fn(), ...overrides,
});
describe('MonitoringListScreen', () => {
  it('renders MonitoringListScreen with filter chips and session cards', async () => {
    await render(
      <MonitoringListScreen
        sessions={[
          { id: '1', title: 'Carabao Mango #042', crop: 'mango', status: 'active', issue: 'Suspected Anthracnose', startDate: 'Oct 1, 2026' }
        ]}
        activeFilter="all"
        onSelectFilter={jest.fn()}
        onSelectSession={jest.fn()}
        onNewSession={jest.fn()}
      />
    );
    expect(screen.getByText(/Crop Monitoring/i)).toBeTruthy();
    expect(screen.getByText(/Carabao Mango #042/i)).toBeTruthy();
    expect(screen.getByText(/Suspected Anthracnose/i)).toBeTruthy();
  });

  it('maps live SQLite rows into the prototype v2 card layout without legacy timeline chips', async () => {
    const onOpen = jest.fn();
    await render(
      <LanguageProvider language="EN">
        <MonitoringListScreen
          rows={[
            {
              id: 'mon-1',
              sourceScanId: 'scan-1',
              source: {
                id: 'scan-1',
                emoji: '🥭',
                title: 'Mangga Carabao #042',
                status: 'moderate',
                detail: 'Anthracnose',
                timeLabel: 'Oct 3, 2026',
                fruitKey: 'mango',
              },
              checkpoints: [
                { id: 'cp-1', dayNumber: 1, scheduledDate: Date.UTC(2026, 9, 3), completedDate: Date.UTC(2026, 9, 3), observation: 'same', note: null, photoUri: null },
                { id: 'cp-5', dayNumber: 5, scheduledDate: Date.UTC(2026, 9, 8), completedDate: null, observation: null, note: null, photoUri: null },
                { id: 'cp-10', dayNumber: 10, scheduledDate: Date.UTC(2026, 9, 13), completedDate: null, observation: null, note: null, photoUri: null },
              ],
            },
          ]}
          onOpen={onOpen}
          onScan={jest.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Crop Monitoring')).toBeTruthy();
    expect(screen.getByText('Mangga Carabao #042')).toBeTruthy();
    expect(screen.getByText('Active Monitoring')).toBeTruthy();
    expect(screen.getByText('Start from New Photo')).toBeTruthy();
    expect(screen.queryByText('Open Scan History')).toBeNull();
  });

  it('falls back to prototype v2 default sessions when rows is empty and triggers capture CTA', async () => {
    const p = props();
    await render(<MonitoringListScreen {...p} />);
    expect(screen.getByText('Mangga Carabao #042')).toBeTruthy();
    expect(screen.getByText('Saging Lakatan Puno #12')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings('EN').monitoringListNewPhoto }));
    expect(p.onScan).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(strings('EN').monitoringListHistory)).toBeNull();
  });

  it('shows loading and read failure with retry without displaying an empty claim', async () => {
    const p = props({ loading: true });
    const { rerender } = await render(<MonitoringListScreen {...p} />);
    expect(screen.getByText(strings('EN').monitoringListLoading)).toBeTruthy();
    expect(screen.queryByText(strings('EN').monitoringListEmpty)).toBeNull();
    await rerender(<MonitoringListScreen {...p} loading={false} error />);
    expect(screen.getByRole('alert')).toHaveTextContent(strings('EN').monitoringListError);
    await fireEvent.press(screen.getByRole('button', { name: strings('EN').retry }));
    expect(p.onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(strings('EN').monitoringListEmpty)).toBeNull();
  });

  it('opens source scan ID on card press and displays prototype v2 active status badge', async () => {
    const p = props({ rows: [row] });
    await render(<MonitoringListScreen {...p} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mango' }));
    expect(p.onOpen).toHaveBeenCalledWith('scan-a');
    expect(screen.getByText('Active Monitoring')).toBeTruthy();
    expect(screen.queryByText(strings('EN').monitoringListProgress(1, 2))).toBeNull();
    expect(screen.queryByText(/recovery|improving|%/i)).toBeNull();
  });

  it('localizes header, filter pills, status badge, and CTA in Filipino', async () => {
    const p = props({ rows: [row] });
    await render(<LanguageProvider language="FIL"><MonitoringListScreen {...p} /></LanguageProvider>);
    expect(screen.getByText('Mga Pagsubaybay (Monitoring)')).toBeTruthy();
    expect(screen.getByText('Aktibong Pagsusubaybay')).toBeTruthy();
    expect(screen.getByText('Mag-log ng Bagong Pananim mula sa Litrato')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mango' }));
    expect(p.onOpen).toHaveBeenCalledWith('scan-a');
  });

  it('keeps existing rows usable while refreshing', async () => {
    await render(<MonitoringListScreen {...props({ rows: [row], loading: true })} />);
    expect(screen.getByText(strings('EN').monitoringListLoading)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mango' })).toBeTruthy();
  });

  it('marks finished entries with 10-Day Complete status badge and filters by Completed', async () => {
    const completeRow: MonitoringListRow = {
      ...row,
      checkpoints: row.checkpoints.map(checkpoint => ({ ...checkpoint, completedDate: Date.UTC(2026, 9, 12), observation: 'unsure' })),
    };
    await render(<MonitoringListScreen {...props({ rows: [completeRow] })} />);
    expect(screen.getByText('10-Day Complete')).toBeTruthy();
    expect(screen.queryByText(strings('EN').monitoringListPending)).toBeNull();
    expect(screen.queryByText(strings('EN').monitoringListComplete)).toBeNull();
  });
});
