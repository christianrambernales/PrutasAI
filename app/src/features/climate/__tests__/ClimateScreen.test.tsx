import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ClimateScreen } from '../ClimateScreen';
import { LanguageProvider } from '../../../ui';
import * as preview from '../../../preview/previewContent';
import { textOf } from '../../../testing/interaction';
import type { Suitability } from '../../viewModels';

const fetchedAt = Date.UTC(2026, 8, 20);

function renderClimate(language: 'EN' | 'FIL', suitability: Suitability): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <LanguageProvider language={language}>
        <ClimateScreen
          climate={preview.CLIMATE}
          normals={preview.NORMALS}
          suitability={suitability}
          fruits={preview.FRUITS}
          selectedFruitKey="banana"
          status="ready"
          currentStatus="ready"
          error={null}
          hasLocation
          onRetry={() => undefined}
          onSelectFruit={() => undefined}
          onChangeLocation={() => undefined}
        />
      </LanguageProvider>,
    );
  });
  return tree;
}

it('renders ClimateScreen with 3-metric grid and 12-month histogram', async () => {
  await render(
    <ClimateScreen
      locationName="Davao City, Region XI"
      suitabilityHeadline="Mango: Highly Suitable"
      seasonLabel="Induction Season"
      rationale="Temperature supports floral bud development"
      humidity="78%"
      rainfall="1.4 mm"
      elevation="32 m"
      onChangeLocation={jest.fn()}
      onBackHome={jest.fn()}
    />
  );
  expect(screen.getByText(/Climate & Suitability/i)).toBeTruthy();
  expect(screen.getByText(/Mango: Highly Suitable/i)).toBeTruthy();
  expect(screen.getByText(/12-Month Rainfall Normals/i)).toBeTruthy();
  expect(screen.getByText('78%')).toBeTruthy();
  expect(screen.getByText('1.4 mm')).toBeTruthy();
  expect(screen.getByText('32 m')).toBeTruthy();
  expect(screen.getByText('Humidity')).toBeTruthy();
  expect(screen.getByText('Rainfall')).toBeTruthy();
  expect(screen.getByText('Elevation')).toBeTruthy();
  expect(screen.getByText('Ene')).toBeTruthy();
  expect(screen.getByText('Dis')).toBeTruthy();
});

it('triggers onChangeLocation and onBackHome callbacks', async () => {
  const onChangeLocation = jest.fn();
  const onBackHome = jest.fn();
  await render(
    <ClimateScreen
      locationName="Davao City, Region XI"
      suitabilityHeadline="Mango: Highly Suitable"
      onChangeLocation={onChangeLocation}
      onBackHome={onBackHome}
    />
  );
  await fireEvent.press(screen.getByRole('button', { name: /Change/i }));
  expect(onChangeLocation).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByRole('button', { name: /Back to Home/i }));
  expect(onBackHome).toHaveBeenCalledTimes(1);
});

test.each(['EN', 'FIL'] as const)(
  'Climate renders strictly the 5 prototype v2 elements in %s without legacy provenance rows',
  language => {
    const suitability: Suitability = {
      ...preview.SUITABILITY,
      provisional: true,
      missingFields: ['elevation'],
      evidenceFetchedAt: fetchedAt,
      evidenceSource: 'Open-Meteo Best Match (reanalysis)',
      evidencePeriod: { fromYear: 2023, toYear: 2024 },
      evidenceCached: true,
      evidenceStatus: 'cached',
    };
    const tree = renderClimate(language, suitability);
    const text = textOf(tree.root);

    expect(text).toContain(language === 'FIL' ? 'Panahon & Kaangkupan' : 'Climate & Suitability');
    expect(text).toContain(
      language === 'FIL' ? 'Mangga: Angkop sa Kasalukuyan' : 'Mango: Highly Suitable',
    );
    expect(text).toContain(
      language === 'FIL'
        ? '12-Buwang Karaniwang Ulan (Open-Meteo Normals)'
        : '12-Month Rainfall Normals',
    );
    expect(text).toContain('1991–2020 Baseline');
    expect(text).toContain(language === 'FIL' ? 'Bumalik sa Home' : 'Back to Home');
    expect(text).not.toContain('Provisional suitability only');
    expect(text).not.toContain('Pansamantala lamang ang pagiging angkop');
    expect(text).not.toContain(preview.CLIMATE.coordsLabel);
    expect(text).not.toContain('Annual total');
    expect(text).not.toContain('Open-Meteo Best Match');
  },
);

it('renders prototype v2 default climate view even when hasLocation is false', async () => {
  await render(
    <ClimateScreen
      climate={null}
      normals={null}
      suitability={null}
      hasLocation={false}
      onChangeLocation={jest.fn()}
      onBackHome={jest.fn()}
    />,
  );
  expect(screen.getByText(/Climate & Suitability/i)).toBeTruthy();
  expect(screen.getByText(/Davao City, Region XI/i)).toBeTruthy();
  expect(screen.getByText(/Mango: Highly Suitable/i)).toBeTruthy();
  expect(screen.getByText('78%')).toBeTruthy();
  expect(screen.getByText('1.4 mm')).toBeTruthy();
  expect(screen.getByText('32 m')).toBeTruthy();
  expect(screen.getByText(/12-Month Rainfall Normals/i)).toBeTruthy();
  expect(screen.getByText(/Back to Home/i)).toBeTruthy();
  expect(screen.queryByText('No location set')).toBeNull();
});
