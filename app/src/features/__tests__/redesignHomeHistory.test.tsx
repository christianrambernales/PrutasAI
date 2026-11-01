import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HomeScreen, HomeScreenProps } from '../home/HomeScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { ScanRow } from '../components/ScanRow';
import { useHistoryFilters } from '../history/useHistoryFilters';
import { LanguageProvider, strings } from '../../ui';
import type { Language } from '../../ui';
import type { ScanSummary } from '../viewModels';

const saved: ScanSummary = {
  id: 'real-local-record-9',
  emoji: '🥭',
  title: 'Mango · Carabao',
  status: 'undetermined',
  detail: 'No disease analysis',
  timeLabel: 'Oct 9',
  fruitKey: 'mango',
};

function homeProps(language: Language = 'EN'): HomeScreenProps {
  const t = strings(language);
  return {
    capabilityHeadline: t.modelStatusEmptyHeadline,
    capabilityDetail: t.modelInferenceUnverified,
    readyModelCount: 0,
    totalModelCount: 3,
    climate: null,
    recentScans: [],
    language,
    fruits: [{ key: 'mango', emoji: '🥭', nameEn: 'Mango', nameFil: 'Mangga', varietyCount: 2 }],
    onSetLocation: jest.fn(),
    onToggleLanguage: jest.fn(),
    onScan: jest.fn(),
    onOpenFruit: jest.fn(),
    onOpenScan: jest.fn(),
    onOpenSettings: jest.fn(),
    onOpenClimate: jest.fn(),
    onViewAllScans: jest.fn(),
    onOpenChat: jest.fn(),
    onOpenMonitoring: jest.fn(),
  };
}

it('renders Home Screen matching prototype v2 composition', async () => {
  await render(
    <HomeScreen
      capabilityHeadline="Offline Mode"
      capabilityDetail="No model"
      readyModelCount={0}
      totalModelCount={3}
      fruits={[
        { key: 'mango', name: 'Mango', emoji: '🥭', diseaseCount: 2 },
        { key: 'banana', name: 'Banana', emoji: '🍌', diseaseCount: 3 },
        { key: 'papaya', name: 'Papaya', emoji: '🍈', diseaseCount: 1 },
      ]}
      climate={null}
      recentScans={[]}
      language="EN"
      onToggleLanguage={jest.fn()}
      onScan={jest.fn()}
      onOpenFruit={jest.fn()}
      onOpenScan={jest.fn()}
      onOpenSettings={jest.fn()}
      onOpenClimate={jest.fn()}
      onViewAllScans={jest.fn()}
      onSetLocation={jest.fn()}
    />
  );
  expect(screen.getByText(/Good day!/i)).toBeTruthy();
  expect(screen.getByText(/Take or Choose Photo/i)).toBeTruthy();
  expect(screen.getByText(/Recent Activity/i)).toBeTruthy();
  expect(screen.getByText(/Crop Profiles & Guidance/i)).toBeTruthy();
  expect(screen.getByText(/Climate Normals/i)).toBeTruthy();
});

describe.each<Language>(['EN', 'FIL'])('dashboard in %s', language => {
  it('renders localized header, primary action, and crop guidance', async () => {
    const t = strings(language);
    const props = homeProps(language);
    await render(
      <LanguageProvider language={language}>
        <HomeScreen {...props} />
      </LanguageProvider>
    );
    expect(screen.getByText(t.prototypeGreeting)).toBeTruthy();
    expect(screen.getByText(t.prototypeTakeChoosePhoto)).toBeTruthy();
    expect(screen.getByText(t.prototypeRecentActivity)).toBeTruthy();
    expect(screen.getByText(t.prototypeCropProfiles)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t.prototypeCameraAction }));
    expect(props.onScan).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: t.prototypeGalleryAction }));
    expect(props.onScan).toHaveBeenCalledTimes(2);
  });

  it('keeps history, climate, monitoring, and fruit guidance destinations connected', async () => {
    const t = strings(language);
    const props = homeProps(language);
    await render(
      <LanguageProvider language={language}>
        <HomeScreen {...props} />
      </LanguageProvider>
    );

    await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.prototypeViewHistory) }));
    expect(props.onViewAllScans).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: /Carabao #042/i }));
    expect(props.onOpenMonitoring).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.prototypeEncyclopedia) }));
    expect(props.onOpenFruit).toHaveBeenCalledWith('mango');

    await fireEvent.press(
      screen.getByRole('button', { name: language === 'FIL' ? 'Mangga' : 'Mango' })
    );
    expect(props.onOpenFruit).toHaveBeenCalledWith('mango');

    await fireEvent.press(
      screen.getByRole('button', { name: language === 'FIL' ? 'Saging' : 'Banana' })
    );
    expect(props.onOpenFruit).toHaveBeenCalledWith('banana');

    await fireEvent.press(screen.getByRole('button', { name: 'Papaya' }));
    expect(props.onOpenFruit).toHaveBeenCalledWith('papaya');

    await fireEvent.press(screen.getByRole('button', { name: /Davao City/i }));
    expect(props.onOpenClimate).toHaveBeenCalledTimes(1);
  });

  it('opens the selected real scan and localized crop identity', async () => {
    const props = { ...homeProps(language), recentScans: [saved] };
    await render(
      <LanguageProvider language={language}>
        <HomeScreen {...props} />
      </LanguageProvider>
    );
    await fireEvent.press(screen.getByRole('button', { name: saved.title }));
    expect(props.onOpenScan).toHaveBeenCalledWith(saved.id);
    await fireEvent.press(
      screen.getByRole('button', { name: language === 'FIL' ? 'Mangga' : 'Mango' })
    );
    expect(props.onOpenFruit).toHaveBeenCalledWith('mango');
  });
});

it('does not display numeric conditions from an unavailable climate snapshot', async () => {
  const props = {
    ...homeProps(),
    climate: {
      place: 'Saved coarse location',
      coordsLabel: '14.6, 121.0',
      freshness: 'unavailable' as const,
      freshnessLabel: 'Unavailable',
      temperatureC: 29,
      condition: 'Sunny',
      feelsLikeLabel: '30°C',
      humidityPct: 80,
      rainTodayMm: 2,
      elevationM: 10,
    },
  };
  await render(<HomeScreen {...props} />);
  expect(screen.queryByText('29°C')).toBeNull();
  expect(screen.getByText(strings('EN').climateUnavailable)).toBeTruthy();
});

it('discloses a missing local photo without substituting an illustrated photo', async () => {
  await render(<ScanRow scan={{ ...saved, imageUri: 'file:///missing-local-image.jpg' }} />);
  await fireEvent(screen.getByTestId('scan-photo-real-local-record-9'), 'error');
  expect(screen.getByText('Local photo unavailable')).toBeTruthy();
});

it('keeps search, stable filters and record reopening connected to real groups', async () => {
  const onOpenScan = jest.fn();
  const banana = { ...saved, id: 'banana-real-3', title: 'Banana · Lakatan', fruitKey: 'banana' };
  const groups = [{ label: 'Today', scans: [saved, banana] }];
  function Host() {
    const [query, setQuery] = useState<string | null>(null);
    const [filter, setFilter] = useState('All');
    const view = useHistoryFilters({
      scanGroups: groups,
      allScans: [saved, banana],
      historyQuery: query,
      historyFilter: filter,
      t: strings('EN'),
    });
    return (
      <HistoryScreen
        groups={view.visibleGroups}
        filters={view.filters}
        activeFilterKey={filter}
        totalLabel={`${view.visibleCount} scans`}
        query={query}
        onChangeQuery={setQuery}
        onFilter={setFilter}
        onOpenScan={onOpenScan}
      />
    );
  }
  await render(<Host />);
  await fireEvent.changeText(screen.getByLabelText(strings('EN').searchScans), 'Carabao');
  expect(screen.queryByRole('button', { name: banana.title })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: saved.title }));
  expect(onOpenScan).toHaveBeenCalledWith(saved.id);
  await fireEvent.changeText(screen.getByLabelText(strings('EN').searchScans), '');
  await fireEvent.press(screen.getByRole('button', { name: 'Banana · 1' }));
  expect(screen.queryByRole('button', { name: saved.title })).toBeNull();
  expect(screen.getByRole('button', { name: banana.title })).toBeTruthy();
});

it('keeps History errors actionable and retains already loaded records', async () => {
  const onRetry = jest.fn();
  await render(
    <HistoryScreen
      groups={[{ label: 'Today', scans: [saved] }]}
      filters={[{ key: 'All', label: 'All · 1' }]}
      activeFilterKey="All"
      totalLabel="1 scan"
      query=""
      onChangeQuery={jest.fn()}
      onFilter={jest.fn()}
      onOpenScan={jest.fn()}
      error="Internal details are not user copy"
      onRetry={onRetry}
    />
  );
  expect(screen.getByText(strings('EN').historyReadError)).toBeTruthy();
  expect(screen.queryByText('Internal details are not user copy')).toBeNull();
  expect(screen.getByRole('button', { name: saved.title })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: strings('EN').retry }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
