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

  it('offers real capture and history actions in the empty state', async () => {
    const p = props();
    await render(<MonitoringListScreen {...p} />);
    expect(screen.getByText(strings('EN').monitoringListEmpty)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings('EN').monitoringListNewPhoto }));
    await fireEvent.press(screen.getByRole('button', { name: strings('EN').monitoringListHistory }));
    expect(p.onScan).toHaveBeenCalledTimes(1);
    expect(p.onOpenHistory).toHaveBeenCalledTimes(1);
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
  it('opens source scan ID and displays actual completed checkpoints, never a recovery claim', async () => {
    const p = props({ rows: [row] });
    await render(<MonitoringListScreen {...p} />);
    await fireEvent.press(screen.getByRole('button', { name: /Open monitoring/ }));
    expect(p.onOpen).toHaveBeenCalledWith('scan-a');
    expect(screen.getByText(strings('EN').monitoringListProgress(1, 2))).toBeTruthy();
    expect(screen.getByText(strings('EN').monitoringListPending)).toBeTruthy();
    expect(screen.queryByText(/recovery|improving|anthracnose|%/i)).toBeNull();
  });
  it('localizes stored metadata, count, action and timeline in Filipino', async () => {
    const p = props({ rows: [row] });
    const t = strings('FIL');
    await render(<LanguageProvider language="FIL"><MonitoringListScreen {...p} /></LanguageProvider>);
    expect(screen.getByText('Mangga')).toBeTruthy();
    expect(screen.getByText(t.monitoringDay1)).toBeTruthy();
    expect(screen.getByText(t.monitoringDay5)).toBeTruthy();
    expect(screen.getByText(t.monitoringDay10)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.monitoringListOpen('Mangga') }));
    expect(p.onOpen).toHaveBeenCalledWith('scan-a');
  });
  it('keeps existing rows usable while refreshing', async () => {
    await render(<MonitoringListScreen {...props({ rows: [row], loading: true })} />);
    expect(screen.getByText(strings('EN').monitoringListLoading)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Open monitoring/ })).toBeTruthy();
  });

  it('groups finished entries by saved checkpoints and shows actual late completion dates', async () => {
    const completeRow: MonitoringListRow = {
      ...row,
      checkpoints: row.checkpoints.map(checkpoint => ({ ...checkpoint, completedDate: Date.UTC(2026, 9, 12), observation: 'unsure' })),
    };
    await render(<MonitoringListScreen {...props({ rows: [completeRow] })} />);
    expect(screen.getByText(strings('EN').monitoringListComplete)).toBeTruthy();
    expect(screen.queryByText(strings('EN').monitoringListPending)).toBeNull();
    expect(screen.getAllByText('Oct 12, 2026')).toHaveLength(2);
    expect(screen.queryByText('Oct 10, 2026')).toBeNull();
    expect(screen.getByText(strings('EN').monitoringListProgress(2, 2))).toBeTruthy();
  });
});
