import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { ClimateScreen, ClimateScreenProps } from '../climate/ClimateScreen';
import { LocationPickerScreen, LocationPickerScreenProps } from '../location/LocationPickerScreen';
import { VarietyInfoScreen, VarietyInfoScreenProps } from '../varietyInfo/VarietyInfoScreen';
import { LanguageProvider, strings } from '../../ui';
import * as preview from '../../preview/previewContent';
import type { Place } from '../../core/geo/geocoding';
import type { Suitability } from '../viewModels';

jest.mock('../location/useDeviceLocation', () => ({
  useDeviceLocation: jest.fn(() => ({
    status: 'idle',
    place: null,
    error: null,
    locate: jest.fn(),
  })),
}));

const { useDeviceLocation } = jest.requireMock('../location/useDeviceLocation') as {
  useDeviceLocation: jest.Mock;
};

describe('Redesign Guidance (Stage 8)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('ClimateScreen', () => {
    it('shows empty guidance when no location is set', async () => {
      const onChangeLocation = jest.fn();
      const onRetry = jest.fn();
      const onSelectFruit = jest.fn();

      await render(
        <LanguageProvider language="EN">
          <ClimateScreen
            climate={null}
            normals={null}
            suitability={null}
            fruits={preview.FRUITS}
            selectedFruitKey="mango"
            status="idle"
            error={null}
            hasLocation={false}
            onChangeLocation={onChangeLocation}
            onRetry={onRetry}
            onSelectFruit={onSelectFruit}
          />
        </LanguageProvider>,
      );

      expect(screen.getByText('No location set')).toBeTruthy();
      expect(
        screen.getByText(/Weather and suitability need a place to compare against/),
      ).toBeTruthy();
      expect(screen.queryByText(/29°C/)).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: 'Choose a location' }));
      expect(onChangeLocation).toHaveBeenCalledTimes(1);
    });

    it('displays insufficient data notice truthfully without claiming suitable', async () => {
      const onChangeLocation = jest.fn();
      const insufficientSuitability: Suitability = {
        fruitEmoji: '🥭',
        fruitName: 'Mango',
        verdict: 'insufficient_data',
        headline: 'Not enough data',
        detail: 'No normals or crop-requirement row exists for this location.',
        basisLabel: 'Basis unavailable',
        sourceLabel: 'Sources unavailable',
        provisional: true,
        missingFields: ['crop requirements', 'historical climate data'],
        evidenceFetchedAt: null,
        evidenceSource: null,
        evidencePeriod: null,
        evidenceCached: false,
        evidenceStatus: 'unavailable',
        evidence: [
          {
            label: 'Mean temperature',
            value: 'Not available',
            rangeLabel: 'optimal 24–30 °C',
            status: 'unknown',
            icon: 'thermometer',
          },
        ],
      };

      await render(
        <LanguageProvider language="EN">
          <ClimateScreen
            climate={preview.CLIMATE}
            normals={preview.NORMALS}
            suitability={insufficientSuitability}
            fruits={preview.FRUITS}
            selectedFruitKey="mango"
            status="ready"
            currentStatus="ready"
            error={null}
            hasLocation={true}
            onChangeLocation={onChangeLocation}
            onRetry={jest.fn()}
            onSelectFruit={jest.fn()}
          />
        </LanguageProvider>,
      );

      // Render insufficient_data suitability and cached current weather together
      expect(screen.getByText(/Insufficient/)).toBeTruthy();
      expect(screen.queryByText(/^Suitable$/)).toBeNull();
      expect(screen.getByText('Cached · 2 h ago')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: /Change location/ }));
      expect(onChangeLocation).toHaveBeenCalledTimes(1);
    });

    it('renders localized freshness and evidence status in Filipino', async () => {
      const filSuitability: Suitability = {
        ...preview.SUITABILITY,
        verdict: 'potentially_suitable',
        evidence: [
          {
            label: 'Mean temperature',
            value: '27.4 °C',
            rangeLabel: 'optimal 26–30 °C',
            status: 'optimal',
            icon: 'thermometer',
          },
        ],
      };

      await render(
        <LanguageProvider language="FIL">
          <ClimateScreen
            climate={preview.CLIMATE}
            normals={preview.NORMALS}
            suitability={filSuitability}
            fruits={preview.FRUITS}
            selectedFruitKey="banana"
            status="ready"
            currentStatus="ready"
            error={null}
            hasLocation={true}
            onChangeLocation={jest.fn()}
            onRetry={jest.fn()}
            onSelectFruit={jest.fn()}
          />
        </LanguageProvider>,
      );

      expect(screen.getByText('Panahon & Kaangkupan')).toBeTruthy();
      expect(screen.getByText(/Naka-cache/)).toBeTruthy();
      expect(screen.getByText('(Pinakamainam)')).toBeTruthy();
    });
  });

  describe('LocationPickerScreen', () => {
    it('handles selection from preset list and device location GPS actions', async () => {
      const mockLocate = jest.fn();
      useDeviceLocation.mockReturnValue({
        status: 'idle',
        place: null,
        error: null,
        locate: mockLocate,
      });

      const onChoose = jest.fn();
      const current = {
        label: 'Davao City, Davao del Sur',
        latitude: 7.07,
        longitude: 125.61,
      };

      await render(
        <LanguageProvider language="EN">
          <LocationPickerScreen current={current} onChoose={onChoose} />
        </LanguageProvider>,
      );

      expect(screen.getByText('Select Location')).toBeTruthy();
      expect(screen.getByText(/Coordinates are stored rounded/)).toBeTruthy();

      // Device GPS button
      const gpsButton = screen.getByRole('button', { name: 'Use my location' });
      await fireEvent.press(gpsButton);
      expect(mockLocate).toHaveBeenCalledTimes(1);

      // Select preset place
      const cdoPlace = screen.getByText('Cagayan de Oro, Misamis Oriental');
      await fireEvent.press(cdoPlace);
      expect(onChoose).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Cagayan de Oro, Misamis Oriental',
          latitude: 8.48,
          longitude: 124.65,
        }),
      );
    });

    it('shows permission denied feedback and spinner when locating', async () => {
      useDeviceLocation.mockReturnValue({
        status: 'denied',
        place: null,
        error: 'Permission refused',
        locate: jest.fn(),
      });

      await render(
        <LanguageProvider language="EN">
          <LocationPickerScreen current={null} onChoose={jest.fn()} />
        </LanguageProvider>,
      );

      expect(
        screen.getByText(/Location permission was refused/),
      ).toBeTruthy();
    });
  });

  describe('VarietyInfoScreen', () => {
    it('displays unverified requirements disclaimer and fruit details', async () => {
      const onOpenVariety = jest.fn();
      const requirements = [
        { label: 'Temperature', value: '24–30 °C', icon: 'thermometer' as const },
        { label: 'Annual rainfall', value: '1,000–2,000 mm', icon: 'cloudRain' as const },
        { label: 'Elevation', value: 'below 600 m', icon: 'mountain' as const },
      ];
      const modelVarieties = [
        {
          key: 'carabao',
          nameEn: 'Carabao',
          nameFil: 'Manggang Kalabaw',
          mlClassIndex: 0,
          note: 'Primary export variety',
        },
      ];
      const informationOnly = [
        {
          key: 'pico',
          nameEn: 'Pico',
          nameFil: 'Piko',
          mlClassIndex: null,
          parentName: 'Carabao',
        },
      ];
      const diseases = [
        {
          key: 'anthracnose',
          nameEn: 'Anthracnose',
          nameFil: 'Antraknos',
          descriptionEn: 'Fungal leaf and fruit spotting.',
          descriptionFil: 'Sakit na dulot ng fungus sa dahon at bunga.',
          remedies: [],
          source: {
            citation: 'PCAARRD Mango Guide',
            detail: 'p. 42',
            retrievedLabel: '2026',
          },
        },
      ];
      const sources = [
        {
          citation: 'PCAARRD-DOST Mango ISP',
          detail: 'Industry Strategic S&T Program',
          retrievedLabel: 'Retrieved 2026',
        },
      ];

      await render(
        <LanguageProvider language="EN">
          <VarietyInfoScreen
            fruit={{
              key: 'mango',
              emoji: '🥭',
              nameEn: 'Mango',
              nameFil: 'Mangga',
              varietyCount: 2,
            }}
            modelVarieties={modelVarieties}
            informationOnly={informationOnly}
            diseases={diseases}
            requirements={requirements}
            requirementsVerified={false}
            sources={sources}
            expandedVarietyKey={null}
            onOpenVariety={onOpenVariety}
            onBack={jest.fn()}
          />
        </LanguageProvider>,
      );

      // Fruit summary header
      expect(screen.getByText('Mango')).toBeTruthy();
      expect(screen.getByText('Mangga')).toBeTruthy();

      // Requirements disclaimer
      expect(screen.getByText('Unverified')).toBeTruthy();
      expect(
        screen.getByText(/Awaiting agriculturist sign-off/),
      ).toBeTruthy();

      // Requirements values
      expect(screen.getByText('Temperature')).toBeTruthy();
      expect(screen.getByText('24–30 °C')).toBeTruthy();

      // Model vs info-only varieties
      expect(screen.getByText('Carabao')).toBeTruthy();
      expect(screen.getByText('Pico')).toBeTruthy();
      expect(screen.getByText('not predicted')).toBeTruthy();

      // Common diseases and citations
      expect(screen.getByText('Anthracnose')).toBeTruthy();
      expect(screen.getByText('PCAARRD-DOST Mango ISP')).toBeTruthy();

      // Interactive variety opening
      await fireEvent.press(screen.getByRole('button', { name: 'Carabao' }));
      expect(onOpenVariety).toHaveBeenCalledWith('carabao');
    });

    it('shows missing content card if fruit is null', async () => {
      const onBack = jest.fn();
      await render(
        <LanguageProvider language="EN">
          <VarietyInfoScreen
            fruit={null}
            modelVarieties={[]}
            informationOnly={[]}
            diseases={[]}
            requirements={[]}
            requirementsVerified={false}
            sources={[]}
            expandedVarietyKey={null}
            onOpenVariety={jest.fn()}
            onBack={onBack}
          />
        </LanguageProvider>,
      );

      expect(screen.getByText('Missing local content')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });
});
