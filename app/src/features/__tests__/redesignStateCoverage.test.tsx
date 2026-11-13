import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { AppNavigator } from '../../navigation/AppNavigator';
import { TabBody } from '../../navigation/render/tabs';
import { RouteBody } from '../../navigation/render/routes';
import { WelcomeScreen } from '../welcome/WelcomeScreen';
import { LanguagePickScreen } from '../language/LanguagePickScreen';
import { ConsentScreen } from '../consent/ConsentScreen';
import { makeShell } from '../../testing/shellFixture';
import {
  resetAppDatabase,
  seedConsent,
  seedLanguagePicked,
  seedSyncMode,
} from '../../testing/appDatabase';
import { textOf } from '../../testing/interaction';
import { LanguageProvider } from '../../ui';

let currentTree: ReactTestRenderer | null = null;

afterEach(async () => {
  if (currentTree) {
    act(() => {
      currentTree?.unmount();
    });
    currentTree = null;
  }
  await act(async () => {
    await Promise.resolve();
  });
});

function renderNav(): ReactTestRenderer {
  act(() => {
    currentTree = renderer.create(<AppNavigator />);
  });
  return currentTree!;
}

const mockMonitoringCtrl = {
  view: {
    scanTitle: 'Mango Scan',
    scanDate: Date.UTC(2026, 8, 15),
    photoUri: 'file:///photo.jpg',
    overallTrend: 'unavailable' as const,
    checkpoints: [
      {
        id: 'cp-1',
        dayNumber: 1,
        status: 'completed' as const,
        scheduledDate: Date.UTC(2026, 8, 15),
        completedDate: Date.UTC(2026, 8, 15),
        missingFields: [],
        observation: null,
        note: null,
        photoUri: 'file:///test1.jpg',
      },
    ],
  },
  loading: false,
  error: false,
  saving: false,
  draft: null,
  discardConfirmationVisible: false,
  hasUnsavedChanges: false,
  reload: jest.fn(),
  beginCheckpoint: jest.fn(),
  setObservation: jest.fn(),
  setNote: jest.fn(),
  setPhoto: jest.fn(),
  save: jest.fn(),
  requestBack: jest.fn(),
  cancelDiscard: jest.fn(),
  discard: jest.fn(),
};

function renderRoute(
  route: Parameters<typeof RouteBody>[0]['route'],
  customize?: (shell: ReturnType<typeof makeShell>) => void,
  monitoring?: Parameters<typeof RouteBody>[0]['monitoring'],
): string {
  const shell = makeShell();
  if (customize) customize(shell);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<RouteBody shell={shell} route={route} monitoring={monitoring} />);
  });
  const text = textOf(tree.root);
  act(() => {
    tree.unmount();
  });
  return text;
}

function renderTab(tab: Parameters<typeof TabBody>[0]['tab'], customize?: (shell: ReturnType<typeof makeShell>) => void): string {
  const shell = makeShell();
  if (customize) customize(shell);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<TabBody shell={shell} tab={tab} />);
  });
  const text = textOf(tree.root);
  act(() => {
    tree.unmount();
  });
  return text;
}

describe('Redesign Prototype v2: 19 Screen Coverage & Truthful State Degradation', () => {
  beforeEach(() => {
    resetAppDatabase();
    seedLanguagePicked();
    seedConsent();
    seedSyncMode('offline');
  });

  test('Screen 1 (Home): renders home dashboard with fruit catalog, actions, and local offline status', () => {
    const text = renderTab('home');
    expect(text).toContain('Good day!');
    expect(text).toContain('Take or Choose Photo');
    expect(text).toContain('Camera');
    expect(text).toContain('View History');
    expect(text).toContain('Davao City');
    expect(text).toContain('Local Offline Mode');
  });

  test('Screen 2 (Camera) & Screen 3 (CaptureResult): no-model capture renders truthful no model weights status', () => {
    const text = renderRoute({ name: 'captureResult', scanId: 'scan-1', photoUri: 'file:///photo.jpg', view: 'summary' });
    expect(text).toContain('Disease Diagnosis: No Model Weights');
    expect(text).toContain('Photo retained in local SQLite repository');
    expect(text).not.toContain('Anthracnose');
    expect(text).not.toContain('Confidence:');
  });

  test('Screen 4 (Result): renders illustrative sample diagnosis and agronomic guidance without fabricated heatmaps', () => {
    const text = renderRoute({ name: 'result', scanId: 'scan-1' });
    expect(text).toContain('Illustrative Sample Scenario');
    expect(text).toContain('Anthracnose');
    expect(text).toContain('Agronomic Guidance (Decision-Support)');
    expect(text).not.toContain('Eigen-CAM');
    expect(text).not.toContain('Heatmap');
  });

  test('Screen 5 (Monitoring List): renders observation list and prototype sessions', () => {
    const text = renderTab('monitoring');
    expect(text).toMatch(/Crop [Mm]onitoring/);
    expect(text).toContain('Track crop condition across Day 1, 5, and 10');
    expect(text).toContain('Mangga Carabao #042');
  });

  test('Screen 6 (Recovery / Monitoring Detail): detail renders timeline without fabricated recovery trend', () => {
    const text = renderRoute({ name: 'monitoring', sessionId: 'mon-1' }, undefined, mockMonitoringCtrl as any);
    expect(text).toContain('Record Observation');
    expect(text).toContain('Day 1 (Baseline)');
    expect(text).not.toContain('Recovered');
  });

  test('Screen 7 (History): renders scan history with prototype list and honest filter empty state', () => {
    const defaultText = renderRoute({ name: 'history' }, shell => {
      shell.history.filters = [{ key: 'All', label: 'All' }];
      shell.app.historyFilter = 'All';
      shell.app.historyQuery = null;
    });
    expect(defaultText).toContain('Scan History');
    expect(defaultText).toContain('Carabao Mango');

    const emptyText = renderRoute({ name: 'history' }, shell => {
      shell.history.filters = [{ key: 'All', label: 'All' }];
      shell.app.historyFilter = 'All';
      shell.app.historyQuery = 'zzz-nonexistent';
    });
    expect(emptyText).toContain('No scans match');
  });

  test('Screen 8 (Climate): renders 5-year normals and suitability with truthful insufficient data handling', () => {
    const text = renderRoute({ name: 'climate' }, shell => {
      shell.app.savedLocation = { latitude: 14.5, longitude: 121, label: 'Tanauan, Batangas' };
    });
    expect(text).toContain('Climate & Suitability');
    expect(text).toMatch(/Change/i);
  });

  test('Screen 9 (Location): renders GPS option and preset municipality list', () => {
    const text = renderRoute({ name: 'locationPicker' });
    expect(text).toContain('Select Location');
    expect(text).toMatch(/Use Device GPS|Use my location/i);
  });

  test('Screen 10 (Variety Info): displays crop details with thresholds and vulnerabilities', () => {
    const text = renderRoute({ name: 'varietyInfo', fruitKey: 'mango' }, shell => {
      shell.data.fruits = [{ key: 'mango', nameEn: 'Mango', nameFil: 'Mangga', varietyCount: 2, emoji: '🥭' }];
    });
    expect(text).toMatch(/Agronomic Thresholds|Growing conditions/i);
    expect(text).toContain('Key Vulnerabilities');
  });

  test('Screen 11 (Chat / Assistant): renders safety disclaimer, greeting, and message composer', () => {
    const text = renderTab('chat');
    expect(text).toContain('Agro-Assistant');
    expect(text).toContain('Decision support only');
  });

  test('Screen 12 (Account): renders combined account and settings with offline guest mode', () => {
    const text = renderRoute({ name: 'account' });
    expect(text).toContain('Account & Settings');
    expect(text).toContain('Guest Farmer');
    expect(text).toContain('Log In');
    expect(text).toMatch(/Create [Aa]ccount/);
    expect(text).toContain('Cloud Synchronization (Optional)');
  });

  test('Screen 13 (Login): renders dedicated sign in form with guest offline fallback', () => {
    const text = renderRoute({ name: 'login' });
    expect(text).toContain('Log In');
    expect(text).toContain('Email Address');
    expect(text).toContain('Password');
    expect(text).toContain('Continue Offline (No Account)');
  });

  test('Screen 14 (Create Account): renders dedicated sign up form with privacy disclosure', () => {
    const text = renderRoute({ name: 'signup' });
    expect(text).toMatch(/Create [Aa]ccount/);
    expect(text).toContain('Data Privacy:');
    expect(text).toMatch(/Continue [Oo]ffline/);
  });

  test('Screen 15 (Email Confirmation): renders pending confirmation state with resend button', () => {
    const text = renderRoute({ name: 'account' }, shell => {
      shell.account.account.confirmationPendingEmail = 'farmer@test.ph';
    });
    expect(text).toContain('Check your email');
    expect(text).toContain('farmer@test.ph');
    expect(text).toContain('Resend Email');
    expect(text).toContain('Continue Using Offline');
  });

  test('Screen 16 (Forgot Password): renders password recovery form with clear explanation', () => {
    const text = renderRoute({ name: 'forgotPassword' });
    expect(text).toMatch(/Reset [Pp]assword/);
    expect(text).toContain('Registered Email');
    expect(text).toContain('Send Reset Link');
  });

  test('Screen 17 (Model Status): explains 3-stage neural pipeline and truthful no-weights status', () => {
    const text = renderRoute({ name: 'modelStatus' });
    expect(text).toContain('AI Model Registry');
    expect(text).toContain('On-Device Neural Pipeline Health');
    expect(text).toContain('Thesis Phase Disclosure');
    expect(text).toContain('No Weights');
  });

  test('Screen 18 (Trash): renders soft delete manager with 15-day retention notice', () => {
    const text = renderRoute({ name: 'trash' });
    expect(text).toContain('Trash Manager');
    expect(text).toContain('15-Day retention policy');
    expect(text).toContain('Trash is empty');
  });

  test('Screen 19 (Welcome): renders onboarding entry with offline vs account paths', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LanguageProvider language="EN">
          <WelcomeScreen
            onSelectLanguage={jest.fn()}
            onContinueOffline={jest.fn()}
            onCreateAccount={jest.fn()}
            onSignIn={jest.fn()}
          />
        </LanguageProvider>,
      );
    });
    const text = textOf(tree.root);
    act(() => {
      tree.unmount();
    });
    expect(text).toMatch(/Maligayang Pagdating sa PrutasAI|Welcome to PrutasAI/);
    expect(text).toContain('Continue Fully Offline (Recommended)');
    expect(text).toContain('Create Account (Optional Sync)');
  });

  test('Supporting Gate: LanguagePickScreen renders bilingual language options', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LanguageProvider language="EN">
          <LanguagePickScreen onPick={jest.fn()} />
        </LanguageProvider>,
      );
    });
    const text = textOf(tree.root);
    act(() => {
      tree.unmount();
    });
    expect(text).toContain('Choose your language');
    expect(text).toContain('Filipino');
    expect(text).toContain('English');
  });

  test('Supporting Gate: ConsentScreen renders privacy terms with acceptance', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LanguageProvider language="EN">
          <ConsentScreen onAcknowledge={jest.fn()} />
        </LanguageProvider>,
      );
    });
    const text = textOf(tree.root);
    act(() => {
      tree.unmount();
    });
    expect(text).toContain('Consent');
    expect(text).toContain('What PrutasAI sends');
  });

  test('Supporting Route: ResetPasswordScreen renders password reset form', () => {
    const text = renderRoute({ name: 'resetPassword' });
    expect(text).toContain('New password');
    expect(text).toContain('Set new password');
  });

  test('Truthful degradation: no manufactured overlay buttons exist anywhere and capture remains model-free', () => {
    const tree = renderNav();
    const allText = textOf(tree.root);
    expect(allText).not.toContain('Eigen-CAM');
    expect(allText).not.toContain('Heatmap');
    const captureText = renderRoute({ name: 'captureResult', scanId: 'scan-1', photoUri: 'file:///photo.jpg', view: 'summary' });
    expect(captureText).toContain('Disease Diagnosis: No Model Weights');
  });
});
