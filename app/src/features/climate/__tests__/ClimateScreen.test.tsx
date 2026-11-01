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

test.each([
  ['EN', 'Provisional suitability only', 'Missing Elevation', 'Using historical data saved on 2026-09-20', 'Historical data period: 2023–2024'],
  ['FIL', 'Pansamantala lamang ang pagiging angkop', 'Taas sa dagat', 'na-save noong 2026-09-20', 'Panahon ng makasaysayang datos: 2023–2024'],
] as const)('Climate keeps provisional cached provenance visible in %s', (language, provisional, missing, cached, period) => {
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

  expect(text).toContain(provisional);
  expect(text).toContain(missing);
  expect(text).toContain(cached);
  expect(text).toContain(period);
  expect(text).toContain('Open-Meteo Best Match');
});

test.each([
  ['EN', 'retrieval date is unavailable'],
  ['FIL', 'Walang petsa kung kailan kinuha'],
] as const)('Climate discloses a missing historical retrieval date in %s', (language, warning) => {
  const tree = renderClimate(language, { ...preview.SUITABILITY, evidenceFetchedAt: null });
  expect(textOf(tree.root)).toContain(warning);
});
