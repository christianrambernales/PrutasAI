import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { ClimateScreen } from '../climate/ClimateScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { LocationPickerScreen } from '../location/LocationPickerScreen';
import { VarietyInfoScreen } from '../varietyInfo/VarietyInfoScreen';
import { LanguageProvider } from '../../ui';
import * as preview from '../../preview/previewContent';
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

  describe('HistoryScreen', () => {
    it('renders 3 prototype default scan records without offline banner, group headers, secondary finding badge, or total count footer', async () => {
      const onOpenScan = jest.fn();
      const onBackHome = jest.fn();

      await render(
        <LanguageProvider language="EN">
          <HistoryScreen
            groups={[{ label: 'TODAY', scans: [] }]}
            allCount={0}
            filters={[
              { key: 'All', label: 'All (3)' },
              { key: 'mango', label: '🥭 Mangga' },
              { key: 'banana', label: '🍌 Saging' },
              { key: 'papaya', label: '🍈 Papaya' },
            ]}
            activeFilterKey="All"
            totalLabel="3 scans stored on device"
            query={null}
            offline={true}
            onChangeQuery={jest.fn()}
            onFilter={jest.fn()}
            onOpenScan={onOpenScan}
            onBackHome={onBackHome}
          />
        </LanguageProvider>,
      );

      expect(screen.getByText('Scan History')).toBeTruthy();
      expect(screen.getByText('Carabao Mango')).toBeTruthy();
      expect(screen.getByText('Lakatan Banana')).toBeTruthy();
      expect(screen.getByText('Red Lady Papaya')).toBeTruthy();
      expect(screen.getByText('SCAN-2026-0042 • Today • 9:15 AM')).toBeTruthy();
      expect(screen.getByText('SCAN-2026-0039 • Yesterday • 3:40 PM')).toBeTruthy();
      expect(screen.getByText('SCAN-2026-0031 • Oct 5, 2026 • 10:12 AM')).toBeTruthy();

      expect(screen.queryByText('TODAY')).toBeNull();
      expect(screen.queryByText('3 scans stored on device')).toBeNull();
      expect(screen.queryByText(/Saved on this device while offline/i)).toBeNull();
      expect(screen.queryByText('Not analyzed')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: 'Carabao Mango' }));
      expect(onOpenScan).toHaveBeenCalledWith('SCAN-2026-0042');
    });
  });

  describe('ClimateScreen', () => {
    it('renders prototype v2 climate screen when no location is set', async () => {
      const onChangeLocation = jest.fn();
      const onBackHome = jest.fn();

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
            onRetry={jest.fn()}
            onSelectFruit={jest.fn()}
            onBackHome={onBackHome}
          />
        </LanguageProvider>,
      );

      expect(screen.getByText('Climate & Suitability')).toBeTruthy();
      expect(screen.getByText('📍 Davao City, Region XI')).toBeTruthy();
      expect(screen.getByText('Mango: Highly Suitable')).toBeTruthy();
      expect(screen.getByText('78%')).toBeTruthy();
      expect(screen.getByText('1.4 mm')).toBeTruthy();
      expect(screen.getByText('32 m')).toBeTruthy();
      expect(screen.getByText('12-Month Rainfall Normals')).toBeTruthy();
      expect(screen.getByText('1991–2020 Baseline')).toBeTruthy();
      expect(screen.queryByText('No location set')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: /Change location/i }));
      expect(onChangeLocation).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByRole('button', { name: /Back to Home/i }));
      expect(onBackHome).toHaveBeenCalledTimes(1);
    });

    it('renders 1-to-1 prototype suitability and metrics without legacy evidence or fruit chips', async () => {
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

      expect(screen.getByText('Climate & Suitability')).toBeTruthy();
      expect(screen.getByText('Mango: Highly Suitable')).toBeTruthy();
      expect(screen.getByText('Induction Season')).toBeTruthy();
      expect(screen.getByText('74%')).toBeTruthy();
      expect(screen.getByText('2.5 mm')).toBeTruthy();
      expect(screen.getByText('21 m')).toBeTruthy();
      expect(screen.getByText('12-Month Rainfall Normals')).toBeTruthy();
      expect(screen.getByText('1991–2020 Baseline')).toBeTruthy();
      expect(screen.queryByText('Cached · 2 h ago')).toBeNull();
      expect(screen.queryByText(preview.CLIMATE.coordsLabel)).toBeNull();
      expect(screen.queryByText('Mean temperature')).toBeNull();
      expect(screen.queryByText('Annual total')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: /Change location/ }));
      expect(onChangeLocation).toHaveBeenCalledTimes(1);
    });

    it('renders localized Filipino climate cards matching prototype v2', async () => {
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
      expect(screen.getByText('Mangga: Angkop sa Kasalukuyan')).toBeTruthy();
      expect(screen.getByText('Dry Period')).toBeTruthy();
      expect(screen.getByText('12-Buwang Karaniwang Ulan (Open-Meteo Normals)')).toBeTruthy();
      expect(screen.getByText('← Bumalik sa Home')).toBeTruthy();
      expect(screen.queryByText('(Pinakamainam)')).toBeNull();
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
      expect(screen.getByText('Coarse location for climate suitability')).toBeTruthy();
      expect(screen.getByText('City or Municipality')).toBeTruthy();
      expect(screen.queryByText(/Coordinates are stored rounded/)).toBeNull();

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
    it('displays 1-to-1 prototype v2 crop profile, thresholds, and vulnerabilities without legacy footer cards', async () => {
      const onSelectCrop = jest.fn();
      const onScanCrop = jest.fn();
      const onBackHome = jest.fn();
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
            selectedCrop="mango"
            modelVarieties={modelVarieties}
            informationOnly={informationOnly}
            diseases={diseases}
            requirements={requirements}
            requirementsVerified={false}
            sources={sources}
            expandedVarietyKey={null}
            onSelectCrop={onSelectCrop}
            onScanCrop={onScanCrop}
            onBackHome={onBackHome}
            onBack={jest.fn()}
          />
        </LanguageProvider>,
      );

      expect(screen.getByText('🥭 Carabao Mango')).toBeTruthy();
      expect(screen.getByText('Mangifera indica L.')).toBeTruthy();
      expect(screen.getByText('Agronomic Thresholds')).toBeTruthy();
      expect(screen.getByText('24°C – 32°C')).toBeTruthy();
      expect(screen.getByText('1,500 – 2,200 mm')).toBeTruthy();
      expect(screen.getByText('0 – 600m ASL')).toBeTruthy();
      expect(screen.getByText('5.5 – 7.5')).toBeTruthy();
      expect(screen.getByText('Key Vulnerabilities')).toBeTruthy();
      expect(screen.getByText(/Anthracnose/)).toBeTruthy();

      expect(screen.queryByText('Unverified')).toBeNull();
      expect(screen.queryByText(/Awaiting agriculturist sign-off/)).toBeNull();
      expect(screen.queryByText('Identified by the model')).toBeNull();
      expect(screen.queryByText('Information only')).toBeNull();
      expect(screen.queryByText('Sources & Citations')).toBeNull();

      await fireEvent.press(screen.getByRole('tab', { name: '🍌 Banana' }));
      expect(onSelectCrop).toHaveBeenCalledWith('banana');

      await fireEvent.press(screen.getByRole('button', { name: 'Scan this Crop' }));
      expect(onScanCrop).toHaveBeenCalledTimes(1);
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
