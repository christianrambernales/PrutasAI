import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { CaptureResultScreen, CaptureResultScreenProps } from '../result/CaptureResultScreen';
import { ResultScreen } from '../result/ResultScreen';
import { LanguageProvider } from '../../ui';
import type { ScanResult } from '../viewModels';

const realResult: ScanResult = {
  emoji: '🥭',
  stages: [
    { stage: 1, caption: 'STAGE 1 · FRUIT', name: 'Mango', secondary: 'Carabao', confidence: 96, color: '#166534' },
    { stage: 2, caption: 'STAGE 2 · VARIETY', name: 'Carabao', confidence: 92, color: '#15803d' },
    { stage: 3, caption: 'STAGE 3 · DISEASE', name: 'Anthracnose', secondary: 'Colletotrichum gloeosporioides', confidence: 88, color: '#c2410c' },
  ],
  severityLabel: 'moderate',
  severityPercent: 28,
  remedy: {
    treatment: 'Prune infected canopy twigs and bury fallen mummified fruit.',
    timing: 'Apply at flowering and early fruit development before heavy rains.',
    prevention: 'Maintain wide tree spacing for airflow and harvest fruit dry.',
    verified: false,
  },
  savedLabel: 'Saved to local SQLite database',
};

function defaultCaptureProps(overrides?: Partial<CaptureResultScreenProps>): CaptureResultScreenProps {
  return {
    photoUri: 'file:///local-photo.jpg',
    cropName: 'Mango (Carabao)',
    cropScientific: 'Mangifera indica',
    cropEmoji: '🥭',
    matchPercentage: '96%',
    recordId: 'SCAN-2026-0043',
    locationCoords: '14.17°N, 121.24°E',
    onRetake: jest.fn(),
    onBrowseKnowledge: jest.fn(),
    onStartMonitoring: jest.fn(),
    onOpenDemoResult: jest.fn(),
    onReviewPhoto: jest.fn(),
    onBrowseGuidance: jest.fn(),
    onBackToSummary: jest.fn(),
    ...overrides,
  };
}

describe('CaptureResultScreen (Screen 3 - 1:1 Prototype Alignment)', () => {
  afterEach(async () => {
    await cleanup();
  });

  it('renders CaptureResultScreen with auto-detected card and demo button', async () => {
    const onDemo = jest.fn();
    await render(
      <CaptureResultScreen
        cropName="Mango (Carabao)"
        cropScientific="Mangifera indica"
        cropEmoji="🥭"
        matchPercentage="96%"
        recordId="SCAN-2026-0043"
        locationCoords="14.17°N, 121.24°E"
        onRetake={jest.fn()}
        onBrowseKnowledge={jest.fn()}
        onStartMonitoring={jest.fn()}
        onOpenDemoResult={onDemo}
      />,
    );
    expect(screen.getByText(/Scan Detection Result/i)).toBeTruthy();
    expect(screen.getByText(/Auto-Detected Fruit Crop/i)).toBeTruthy();
    expect(screen.getByText(/Disease Diagnosis: No Model Weights/i)).toBeTruthy();
    const demoBtn = screen.getByText(/View Illustrative Sample Screen/i);
    expect(demoBtn).toBeTruthy();
    await act(async () => {
      fireEvent.press(demoBtn);
    });
    expect(onDemo).toHaveBeenCalledTimes(1);
  });

  it('displays truthful degradation notice and disclosure without speculative disease scores', async () => {
    const props = defaultCaptureProps();
    await render(<CaptureResultScreen {...props} />);

    expect(screen.getByRole('header', { name: /Disease Diagnosis: No Model Weights/i })).toBeTruthy();
    expect(
      screen.getByText(
        /In this thesis development phase, diagnostic weights are not installed, so no speculative disease percentages are fabricated\./i,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Photo retained in local SQLite repository/i)).toBeTruthy();
    expect(screen.getByText(/SCAN-2026-0043/i)).toBeTruthy();
    expect(screen.getByText(/14\.17°N, 121\.24°E/i)).toBeTruthy();
  });

  it('provides safe actionable pathways and triggers callbacks', async () => {
    const props = defaultCaptureProps();
    await render(<CaptureResultScreen {...props} />);

    const knowledgeBtn = screen.getByText(/Browse Local Crop Knowledge/i);
    const monitorBtn = screen.getByText(/Start Manual Monitoring Session/i);
    const demoBtn = screen.getByText(/View Illustrative Sample Screen/i);
    const retakeBtn = screen.getByText(/Retake/i);

    expect(knowledgeBtn).toBeTruthy();
    expect(monitorBtn).toBeTruthy();
    expect(demoBtn).toBeTruthy();
    expect(retakeBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(knowledgeBtn);
    });
    expect(props.onBrowseKnowledge).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(monitorBtn);
    });
    expect(props.onStartMonitoring).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(demoBtn);
    });
    expect(props.onOpenDemoResult).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(retakeBtn);
    });
    expect(props.onRetake).toHaveBeenCalledTimes(1);
  });

  it('renders photo review mode when view=photo with Back to summary button', async () => {
    const props = defaultCaptureProps({ view: 'photo' });
    await render(<CaptureResultScreen {...props} />);

    const backBtn = screen.getByText(/Back to summary/i);
    expect(backBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(backBtn);
    });
    expect(props.onBackToSummary).toHaveBeenCalledTimes(1);
  });

  it('renders localized copy in Filipino', async () => {
    const props = defaultCaptureProps();
    await render(
      <LanguageProvider language="FIL">
        <CaptureResultScreen {...props} />
      </LanguageProvider>,
    );

    expect(screen.getByText('Resulta ng Pag-scan')).toBeTruthy();
    expect(screen.getByText('Awtomatikong Na-detect na Pananim')).toBeTruthy();
    expect(screen.getByText('Pagsusuri sa Sakit: Walang Model Weights')).toBeTruthy();
    expect(screen.getByText('Kumuha Ulit')).toBeTruthy();
    expect(screen.getByText(/Sumangguni sa Gabay ng Pananim/i)).toBeTruthy();
    expect(screen.getByText(/Magsimula ng Manwal na Pagsubaybay/i)).toBeTruthy();
    expect(screen.getByText(/\[Demo Test\] Tingnan ang Halimbawang Resulta/i)).toBeTruthy();
  });
});

describe('ResultScreen (Screen 4 - Illustrative Result 1:1 Prototype Alignment)', () => {
  afterEach(async () => {
    await cleanup();
  });

  it('renders ResultScreen matching illustrative prototype v2 layout', async () => {
    await render(
      <ResultScreen
        cropName="Mango (Carabao)"
        cropEmoji="🥭"
        diseaseName="Anthracnose"
        diseaseScientific="Colletotrichum gloeosporioides"
        severityLabel="MODERATE"
        severityPercentage="28.5%"
        severityCircleText="28%"
        onStartMonitoring={jest.fn()}
      />,
    );
    expect(screen.getByText(/Illustrative Sample Scenario/i)).toBeTruthy();
    expect(screen.getByText(/28.5% • KATAMTAMAN \(MODERATE\)/i)).toBeTruthy();
    expect(screen.getByText(/Agronomic Guidance \(Decision-Support\)/i)).toBeTruthy();
  });

  it('renders top result banner, tentative finding, and severity circle ring gauge', async () => {
    await render(
      <ResultScreen
        cropName="Mango (Carabao)"
        cropEmoji="🥭"
        diseaseName="Anthracnose"
        diseaseScientific="Colletotrichum gloeosporioides"
        severityLabel="MODERATE"
        severityPercentage="28.5%"
        severityCircleText="28%"
        onStartMonitoring={jest.fn()}
      />,
    );

    expect(screen.getByText('Demo')).toBeTruthy();
    expect(screen.getByText(/Auto-Detected Crop \(96% Match\)/i)).toBeTruthy();
    expect(screen.getByText(/Tentative Indication/i)).toBeTruthy();
    expect(screen.getByText('Moderate')).toBeTruthy();
    expect(screen.getByText(/Anthracnose/i)).toBeTruthy();
    expect(screen.getByText(/Colletotrichum gloeosporioides/i)).toBeTruthy();
    expect(screen.getByText('28%')).toBeTruthy();
  });

  it('renders 3 categorized guidance bullets and starts monitoring on CTA press', async () => {
    const onStartMonitoring = jest.fn();
    await render(
      <ResultScreen
        onStartMonitoring={onStartMonitoring}
      />,
    );

    expect(screen.getByText(/BPI Technical Notes/i)).toBeTruthy();
    expect(screen.getByText(/Sanitation:/i)).toBeTruthy();
    expect(screen.getByText(/Precaution:/i)).toBeTruthy();
    expect(screen.getByText(/Referral:/i)).toBeTruthy();

    const cta = screen.getByText(/Start Monitoring Session/i);
    expect(cta).toBeTruthy();
    await act(async () => {
      fireEvent.press(cta);
    });
    expect(onStartMonitoring).toHaveBeenCalledTimes(1);
  });

  it('renders Filipino localized text for ResultScreen', async () => {
    await render(
      <LanguageProvider language="FIL">
        <ResultScreen onStartMonitoring={jest.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByText(/Halimbawang Sitwasyon \(Sample Scenario\)/i)).toBeTruthy();
    expect(screen.getByText(/Maaaring Sakit \(Tentative Indication\)/i)).toBeTruthy();
    expect(screen.getByText(/Tantiyang Apektadong Bahagi/i)).toBeTruthy();
    expect(screen.getByText(/Sanitasyon:/i)).toBeTruthy();
    expect(screen.getByText(/Pag-iingat:/i)).toBeTruthy();
    expect(screen.getByText(/Payo:/i)).toBeTruthy();
    expect(screen.getByText(/Subaybayan ang Puno \(Start Monitoring\)/i)).toBeTruthy();
  });

  it('supports backward-compatible ScanResult result prop', async () => {
    const onStartMonitoring = jest.fn();
    const onAskAssistant = jest.fn();
    await render(
      <ResultScreen
        photoUri="file:///mango-real.jpg"
        result={realResult}
        onStartMonitoring={onStartMonitoring}
        onAskAssistant={onAskAssistant}
      />,
    );

    expect(screen.getByText(/Illustrative Sample Scenario/i)).toBeTruthy();
    expect(screen.getByText(/Agronomic Guidance \(Decision-Support\)/i)).toBeTruthy();
  });
});
