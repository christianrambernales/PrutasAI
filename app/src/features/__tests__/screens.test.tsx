import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { resetAppDatabase, seedConsent, seedLanguagePicked, seedSyncMode } from '../../testing/appDatabase';
import { CaptureScreen } from '../capture/CaptureScreen';
import { CameraCapture } from '../capture/CameraCapture';
import { CaptureResultScreen } from '../result/CaptureResultScreen';
import { ChatScreen } from '../chat/ChatScreen';
import { ConversationSidebar } from '../chat/ConversationSidebar';
import { ClimateScreen } from '../climate/ClimateScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { HomeScreen } from '../home/HomeScreen';
import { LocationPickerScreen } from '../location/LocationPickerScreen';
import { ModelStatusScreen } from '../modelStatus/ModelStatusScreen';
import { MonitoringScreen } from '../monitoring/MonitoringScreen';
import { ResultScreen } from '../result/ResultScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { TrashScreen } from '../trash/TrashScreen';
import { VarietyInfoScreen } from '../varietyInfo/VarietyInfoScreen';
import { ResetPasswordScreen } from '../account/ResetPasswordScreen';
import { routeTitle, RouteBody } from '../../navigation/render/routes';
import { makeShell } from '../../testing/shellFixture';
import { findPressable } from '../../testing/interaction';
import { strings } from '../../ui/i18n/strings';
import * as preview from '../../preview/previewContent';
import { LanguageProvider } from '../../ui';

let renderedTrees: ReactTestRenderer[] = [];

afterEach(async () => {
  for (const tree of renderedTrees) {
    act(() => {
      tree.unmount();
    });
  }
  renderedTrees = [];
  await act(async () => {
    await Promise.resolve();
  });
});

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  renderedTrees.push(tree);
  return tree;
}

/**
 * Every string rendered anywhere in the tree, for content assertions.
 * Adjacent strings inside one element are concatenated — `Day {n}` arrives as
 * ["Day ", "0"] and must read as "Day 0" — while sibling elements are kept
 * apart so unrelated labels never fuse into a phrase nobody rendered.
 */
function texts(tree: ReactTestRenderer): string {
  const collect = (node: unknown): string => {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) {
      const allText = node.every(n => typeof n === 'string' || typeof n === 'number');
      return node.map(collect).join(allText ? '' : ' | ');
    }
    if (typeof node === 'object' && 'children' in node) {
      return collect((node as { children: unknown }).children);
    }
    return '';
  };
  return collect(tree.toJSON());
}

const screen = {
  getByText: (matcher: string | RegExp) => {
    const lastTree = renderedTrees[renderedTrees.length - 1];
    if (!lastTree) throw new Error('No rendered tree');
    const all = texts(lastTree);
    const matches = typeof matcher === 'string' ? all.includes(matcher) : matcher.test(all);
    if (!matches) {
      throw new Error(`Unable to find an element with text: ${matcher}.\nFound in tree:\n${all}`);
    }
    return true;
  },
};

const noop = () => {};

beforeEach(() => {
  resetAppDatabase();
  seedLanguagePicked();
  seedConsent();
  seedSyncMode();
});

test('Home renders prototype dashboard, camera actions, and crop profiles', () => {
  const tree = render(
    <HomeScreen
      capabilityHeadline="Fruit, variety and disease"
      capabilityDetail="All detection stages are available."
      readyModelCount={3}
      totalModelCount={3}
      fruits={preview.FRUITS}
      climate={preview.CLIMATE}
      recentScans={preview.RECENT_SCANS}
      language="EN"
      onToggleLanguage={noop}
      onSetLocation={noop}
      onScan={noop}
      onOpenFruit={noop}
      onOpenScan={noop}
      onOpenSettings={noop}
      onOpenClimate={noop}
      onViewAllScans={noop}
    />,
  );
  const content = texts(tree);
  expect(content).toContain('Good day!');
  expect(content).toContain('Take or Choose Photo');
  expect(content).toContain('Banana');
  expect(content).toContain('View History');
});

test('Capture shows the framing hint and the on-device promise', () => {
  const content = texts(
    render(<CaptureScreen onClose={noop} onCapture={noop} onPickImage={noop} onFlip={noop} />),
  );
  expect(content).toContain('Center the fruit within the frame');
  expect(content).toContain('On-Device Only');
});

test('Result shows illustrative diagnosis, lesion ratio, and agronomic guidance', () => {
  const content = texts(
    render(<ResultScreen result={preview.RESULT} onStartMonitoring={noop} onAskAssistant={noop} />),
  );
  expect(content).toContain('Illustrative Sample Scenario');
  expect(content).toContain('Tentative Indication');
  expect(content).toContain('Anthracnose');
  expect(content).toContain('Estimated Lesion Area Ratio');
});

test('Result renders BPI technical guidance and decision-support sections', () => {
  const content = texts(
    render(<ResultScreen result={preview.RESULT} onStartMonitoring={noop} onAskAssistant={noop} />),
  );
  expect(content).toContain('Agronomic Guidance (Decision-Support)');
  expect(content).toContain('BPI Technical Notes');
});

test('Result renders action to start monitoring from the illustrative scenario', () => {
  const onStartMonitoring = jest.fn();
  const tree = render(
    <ResultScreen
      result={{ ...preview.RESULT, severityLabel: 'undetermined', severityPercent: null }}
      onStartMonitoring={onStartMonitoring}
      onAskAssistant={noop}
    />,
  );
  expect(texts(tree)).toContain('Start Monitoring Session');
  act(() => {
    findPressable(tree, 'Start Monitoring Session').props.onPress();
  });
  expect(onStartMonitoring).toHaveBeenCalledTimes(1);
});

test('Variety info renders agronomic thresholds and key vulnerabilities', () => {
  const content = texts(
    render(
      <VarietyInfoScreen
        fruit={preview.FRUITS[1]}
        modelVarieties={preview.MANGO_VARIETIES}
        informationOnly={preview.MANGO_STRAINS}
        diseases={[]}
        requirementsVerified={false}
        requirements={[{ label: 'Temperature', value: '24–30 °C', icon: 'thermometer' }]}
        sources={preview.MANGO_SOURCES}
        expandedVarietyKey={null}
        onOpenVariety={noop}
      />,
    ),
  );
  expect(content).toContain('Carabao Mango');
  expect(content).toContain('Agronomic Thresholds');
  expect(content).toContain('Key Vulnerabilities');
  expect(content).toContain('Scan this Crop');
});

test('Variety info uses Filipino as primary and keeps linked disease citations visible', () => {
  const content = texts(render(
    <LanguageProvider language="FIL">
      <VarietyInfoScreen
        fruit={preview.FRUITS[0]}
        modelVarieties={preview.VARIETIES_BY_FRUIT.banana}
        informationOnly={[]}
        diseases={[{
          key: 'anthracnose',
          nameEn: 'Anthracnose',
          nameFil: 'Antraknos',
          descriptionEn: 'English detail',
          descriptionFil: 'Detalye sa Filipino',
          source: { citation: 'DA source', detail: 'Mango disease guide', retrievedLabel: 'retrieved 2026-09-17' },
          remedies: [],
        }]}
        requirementsVerified={false}
        requirements={[]}
        sources={[]}
        expandedVarietyKey="anthracnose"
        onOpenVariety={noop}
      />
    </LanguageProvider>,
  ));

  expect(content.indexOf('Saging')).toBeLessThan(content.indexOf('Banana'));
  expect(content.indexOf('Antraknos')).toBeLessThan(content.indexOf('Anthracnose'));
  expect(content).toContain('Detalye sa Filipino');
  expect(content).toContain('DA source');
  expect(content).toContain('Mango disease guide');
});

it('renders LocationPickerScreen matching prototype presets', () => {
  render(
    <LocationPickerScreen
      currentLocation="Davao City, Davao del Sur"
      onSelectLocation={jest.fn()}
      onUseDeviceGps={jest.fn()}
      onCancel={jest.fn()}
    />,
  );
  expect(screen.getByText(/Select Location/i)).toBeTruthy();
  expect(screen.getByText(/Davao City, Davao del Sur/i)).toBeTruthy();
  expect(screen.getByText(/Use Device GPS/i)).toBeTruthy();
});

it('LocationPickerScreen invokes onSelectLocation, onChoose, onUseDeviceGps, and onCancel', () => {
  const onSelectLocation = jest.fn();
  const onChoose = jest.fn();
  const onUseDeviceGps = jest.fn();
  const onCancel = jest.fn();

  const tree = render(
    <LocationPickerScreen
      currentLocation="Davao City, Davao del Sur"
      onSelectLocation={onSelectLocation}
      onChoose={onChoose}
      onUseDeviceGps={onUseDeviceGps}
      onCancel={onCancel}
    />,
  );

  act(() => {
    findPressable(tree, 'Tagum City, Davao del Norte').props.onPress();
    findPressable(tree, 'Use Device GPS').props.onPress();
    findPressable(tree, 'Cancel').props.onPress();
  });

  expect(onSelectLocation).toHaveBeenCalledWith('Tagum City, Davao del Norte');
  expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ label: 'Tagum City, Davao del Norte' }));
  expect(onUseDeviceGps).toHaveBeenCalledTimes(1);
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('renders VarietyInfoScreen matching prototype 2x2 threshold grid', () => {
  render(
    <VarietyInfoScreen
      selectedCrop="mango"
      onSelectCrop={jest.fn()}
      onScanCrop={jest.fn()}
      onBackHome={jest.fn()}
    />,
  );
  expect(screen.getByText(/Carabao Mango/i)).toBeTruthy();
  expect(screen.getByText(/Agronomic Thresholds/i)).toBeTruthy();
  expect(screen.getByText(/Key Vulnerabilities/i)).toBeTruthy();
  expect(screen.getByText(/Scan this Crop/i)).toBeTruthy();
});

it('VarietyInfoScreen tab switching and action buttons invoke callbacks', () => {
  const onSelectCrop = jest.fn();
  const onScanCrop = jest.fn();
  const onBackHome = jest.fn();

  const tree = render(
    <VarietyInfoScreen
      selectedCrop="mango"
      onSelectCrop={onSelectCrop}
      onScanCrop={onScanCrop}
      onBackHome={onBackHome}
    />,
  );

  act(() => {
    findPressable(tree, 'Banana').props.onPress();
    findPressable(tree, 'Scan this Crop').props.onPress();
    findPressable(tree, 'Home').props.onPress();
  });

  expect(onSelectCrop).toHaveBeenCalledWith('banana');
  expect(onScanCrop).toHaveBeenCalledTimes(1);
  expect(onBackHome).toHaveBeenCalledTimes(1);
});

test('Climate shows suitability summary, climate metrics, and 12-month normals', () => {
  const content = texts(
    render(
      <ClimateScreen
        climate={preview.CLIMATE}
        normals={preview.NORMALS}
        suitability={preview.SUITABILITY}
        fruits={preview.FRUITS}
        selectedFruitKey="banana"
        status="ready"
        error={null}
        hasLocation
        onRetry={noop}
        onSelectFruit={noop}
        onChangeLocation={noop}
      />,
    ),
  );
  expect(content).toContain('Mango: Highly Suitable');
  expect(content).toContain('Humidity');
  expect(content).toContain('Rainfall');
  expect(content).toContain('Elevation');
  expect(content).toContain('12-Month Rainfall Normals');
});

test('Chat renders the conversation and decision-support banner without claiming to be offline', () => {
  const content = texts(
    render(
      <ChatScreen
        messages={preview.CHAT}
        suggestions={preview.CHAT_SUGGESTIONS}
        curatedWording
        draft=""
        onChangeDraft={noop}
        onSend={noop}
        onSuggestion={noop}
      />,
    ),
  );
  expect(content).toContain('Pwede bang magtanim');
  expect(content).toContain('Decision support only');
  expect(content).not.toContain('No connection');
});

test('shows the typing indicator while pending', () => {
  const tree = render(
    <ChatScreen
      messages={[]}
      suggestions={[]}
      curatedWording={false}
      draft=""
      onChangeDraft={noop}
      onSend={noop}
      onSuggestion={noop}
      pending
    />,
  );
  expect(tree.root.findAll(node => node.props.testID === 'typing-dot')).toHaveLength(3);
});

/**
 * The strip that carries the left-edge swipe. It has to sit over the
 * transcript: the swipe is claimed on press, and anywhere higher up the tree
 * that would mean claiming across the whole screen.
 */
test('lays an edge-swipe catcher over the transcript when handlers are given', () => {
  const handlers = { onStartShouldSetResponder: () => true };
  const withHandlers = render(
    <ChatScreen
      messages={[]}
      suggestions={[]}
      curatedWording={false}
      draft=""
      onChangeDraft={noop}
      onSend={noop}
      onSuggestion={noop}
      edgeSwipeHandlers={handlers}
    />,
  );
  expect(
    withHandlers.root.findAll(
      node => node.props.onStartShouldSetResponder === handlers.onStartShouldSetResponder,
    ).length,
  ).toBeGreaterThan(0);

  const without = render(
    <ChatScreen
      messages={[]}
      suggestions={[]}
      curatedWording={false}
      draft=""
      onChangeDraft={noop}
      onSend={noop}
      onSuggestion={noop}
    />,
  );
  expect(
    without.root.findAll(
      node => node.props.onStartShouldSetResponder === handlers.onStartShouldSetResponder,
    ),
  ).toHaveLength(0);
});

test('does not show the typing indicator when not pending', () => {
  const tree = render(
    <ChatScreen
      messages={[]}
      suggestions={[]}
      curatedWording={false}
      draft=""
      onChangeDraft={noop}
      onSend={noop}
      onSuggestion={noop}
      pending={false}
    />,
  );
  expect(tree.root.findAll(node => node.props.testID === 'typing-dot')).toHaveLength(0);
});

test('plain Enter calls onSend and prevents the default newline', () => {
  const onSend = jest.fn();
  const tree = render(
    <ChatScreen
      messages={[]}
      suggestions={[]}
      curatedWording={false}
      draft="hello"
      onChangeDraft={noop}
      onSend={onSend}
      onSuggestion={noop}
    />,
  );
  const input = tree.root.find(node => node.props.accessibilityLabel === 'Message'); // t.message in EN
  const preventDefault = jest.fn();
  input.props.onKeyPress({ nativeEvent: { key: 'Enter', shiftKey: false }, preventDefault });

  expect(onSend).toHaveBeenCalledTimes(1);
});

test('Shift+Enter does not call onSend', () => {
  const onSend = jest.fn();
  const tree = render(
    <ChatScreen
      messages={[]}
      suggestions={[]}
      curatedWording={false}
      draft="hello"
      onChangeDraft={noop}
      onSend={onSend}
      onSuggestion={noop}
    />,
  );
  const input = tree.root.find(node => node.props.accessibilityLabel === 'Message');
  input.props.onKeyPress({ nativeEvent: { key: 'Enter', shiftKey: true } });

  expect(onSend).not.toHaveBeenCalled();
});

test('History renders supplied scan groups', () => {
  const content = texts(
    render(
      <HistoryScreen
        groups={preview.SCAN_GROUPS}
        filters={[{ key: 'All', label: 'All' }, { key: 'Diseased', label: 'Diseased' }]}
        activeFilterKey="All"
        totalLabel="6 scans stored on this device"
        query={null}
        onChangeQuery={noop}
        onFilter={noop}
        onOpenScan={noop}
      />,
    ),
  );
  for (const scan of preview.SCAN_GROUPS.flatMap(g => g.scans)) {
    expect(content).toContain(scan.title);
  }
});

test('History shows an empty state when real scans are absent from filtered view', () => {
  const onScan = jest.fn();
  const tree = render(
    <HistoryScreen
      groups={[{ label: 'TODAY', scans: [] }]}
      filters={[{ key: 'All', label: 'All' }]}
      activeFilterKey="All"
      allCount={1}
      totalLabel="0 scans"
      query={null}
      onChangeQuery={noop}
      onFilter={noop}
      onOpenScan={noop}
      onScan={onScan}
    />,
  );
  const content = texts(tree);
  expect(content).toContain('No scans yet');
  expect(content).toContain('Scan a fruit');
  act(() => {
    findPressable(tree, 'Scan a fruit').props.onPress();
  });
  expect(onScan).toHaveBeenCalledTimes(1);
});

test('Monitoring renders timeline checkpoints and SQLite observation form', () => {
  const content = texts(
    render(
      <MonitoringScreen session={preview.SESSION} expandedCheckpointDay={null} onScanCheckpoint={noop} onOpenCheckpoint={noop} />,
    ),
  );
  expect(content).toContain('Day 1 (Baseline)');
  expect(content).toContain('Day 5');
  expect(content).toContain('Day 10');
  expect(content).toContain('Save Observation to SQLite');
});

test('Settings surfaces the privacy and assistant controls', () => {
  const content = texts(
    render(
      <SettingsScreen
        language="EN"
        useLocation
        savedLocationLabel="14.17, 121.24"
        climateProvider="Open-Meteo"
        normalsFetchedLabel="Last fetched 12 Jun 2026"
        aiAssistant={false}
        aiAssistantDetail="Grounded answers only, fully offline"
        contentVersion="2026.08.10"
        modelsLabel="0 of 0 installed"
        historyLabel="6 scans"
        accountLabel="Not signed in"
        onChangeLanguage={noop}
        onToggleLocation={noop}
        onChangeLocation={noop}
        onForgetLocation={noop}
        onRefreshNormals={noop}
        onToggleAiAssistant={noop}
        onOpenModels={noop}
        onOpenHistory={noop}
        onOpenAccount={noop}
        onOpenTrash={noop}
      />,
    ),
  );
  expect(content).toContain('Forget my location');
  expect(content).toContain('AI assistant');
  expect(content).toContain('2026.08.10');
});

test('Model status reports truthful thesis phase disclosure without import controls', () => {
  const content = texts(render(<ModelStatusScreen language="EN" />));
  expect(content).toContain('AI Model Registry');
  expect(content).toContain('Thesis Phase Disclosure');
  expect(content).toContain('No Weights');
  expect(content).toContain('Pipeline Stages');
  expect(content).not.toContain('Import a model file');
});

test('Model status screen renders Filipino copy', () => {
  const content = texts(render(<ModelStatusScreen language="FIL" />));
  expect(content).toContain('Katayuan ng AI Model');
  expect(content).toContain('Yugto ng Thesis Prototype');
  expect(content).toContain('Walang Weights');
});

test('the navigator mounts on the home tab', () => {
  const content = texts(render(<AppNavigator />));
  expect(content).toContain('Good day!');
  expect(content).toContain('Take or Choose Photo');
  expect(content).toContain('Home');
});

test('ResetPasswordScreen renders inputs and cancel button', () => {
  const tree = render(
    <ResetPasswordScreen
      busy={false}
      error={null}
      onSubmitNewPassword={async () => ({ ok: true })}
      onCancel={noop}
      onDone={noop}
    />,
  );
  const content = texts(tree);
  expect(content).toContain('Reset password');
  expect(content).toContain('New password');
  expect(content).toContain('Confirm password');
  expect(content).toContain('Set new password');
  expect(content).toContain('Cancel');
});

test('ResetPasswordScreen validates weak password and does not submit', async () => {
  const onSubmit = jest.fn(async () => ({ ok: true }));
  const tree = render(
    <ResetPasswordScreen
      busy={false}
      error={null}
      onSubmitNewPassword={onSubmit}
    />,
  );
  const newPassInput = tree.root.find(n => n.props.accessibilityLabel === 'New password');
  const confirmInput = tree.root.find(n => n.props.accessibilityLabel === 'Confirm password');
  const submitBtn = tree.root.find(n => n.props.label === 'Set new password');

  act(() => {
    newPassInput.props.onChangeText('123');
    confirmInput.props.onChangeText('123');
  });
  await act(async () => {
    submitBtn.props.onPress();
  });

  expect(onSubmit).not.toHaveBeenCalled();
  const content = texts(tree);
  expect(content).toContain('Password is too weak');
});

test('ResetPasswordScreen validates password mismatch and does not submit', async () => {
  const onSubmit = jest.fn(async () => ({ ok: true }));
  const tree = render(
    <ResetPasswordScreen
      busy={false}
      error={null}
      onSubmitNewPassword={onSubmit}
    />,
  );
  const newPassInput = tree.root.find(n => n.props.accessibilityLabel === 'New password');
  const confirmInput = tree.root.find(n => n.props.accessibilityLabel === 'Confirm password');
  const submitBtn = tree.root.find(n => n.props.label === 'Set new password');

  act(() => {
    newPassInput.props.onChangeText('password123');
    confirmInput.props.onChangeText('password999');
  });
  await act(async () => {
    submitBtn.props.onPress();
  });

  expect(onSubmit).not.toHaveBeenCalled();
  const content = texts(tree);
  expect(content).toContain('Passwords do not match');
});

test('ResetPasswordScreen does not claim success when update fails', async () => {
  const onSubmit = jest.fn(async () => ({ ok: false, errorKey: 'service_unavailable' }));
  const tree = render(
    <ResetPasswordScreen
      busy={false}
      error={null}
      onSubmitNewPassword={onSubmit}
    />,
  );
  const newPassInput = tree.root.find(n => n.props.accessibilityLabel === 'New password');
  const confirmInput = tree.root.find(n => n.props.accessibilityLabel === 'Confirm password');
  const submitBtn = tree.root.find(n => n.props.label === 'Set new password');

  act(() => {
    newPassInput.props.onChangeText('valid-password');
    confirmInput.props.onChangeText('valid-password');
  });
  await act(async () => {
    await submitBtn.props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledWith('valid-password');
  const content = texts(tree);
  expect(content).not.toContain('Password updated');
});

test('ResetPasswordScreen displays completion UI only after provider accepts update', async () => {
  const onSubmit = jest.fn(async () => ({ ok: true }));
  const onDone = jest.fn();
  const tree = render(
    <ResetPasswordScreen
      busy={false}
      error={null}
      onSubmitNewPassword={onSubmit}
      onDone={onDone}
    />,
  );
  const newPassInput = tree.root.find(n => n.props.accessibilityLabel === 'New password');
  const confirmInput = tree.root.find(n => n.props.accessibilityLabel === 'Confirm password');
  const submitBtn = tree.root.find(n => n.props.label === 'Set new password');

  act(() => {
    newPassInput.props.onChangeText('valid-password');
    confirmInput.props.onChangeText('valid-password');
  });
  await act(async () => {
    await submitBtn.props.onPress();
  });

  expect(onSubmit).toHaveBeenCalledWith('valid-password');
  const content = texts(tree);
  expect(content).toContain('Password updated');
  expect(content).toContain('Done');

  const doneBtn = tree.root.find(n => n.props.label === 'Done');
  act(() => {
    doneBtn.props.onPress();
  });
  expect(onDone).toHaveBeenCalledTimes(1);
});

test('routeTitle returns bilingual titles for resetPassword route', () => {
  expect(routeTitle({ name: 'resetPassword' }, strings('EN'), [])).toBe('Reset password');
  expect(routeTitle({ name: 'resetPassword' }, strings('FIL'), [])).toBe('I-reset ang password');
});

test('RouteBody renders ResetPasswordScreen for resetPassword route', () => {
  const shell = makeShell();
  const tree = render(<RouteBody shell={shell} route={{ name: 'resetPassword' }} />);
  const content = texts(tree);
  expect(content).toContain('Set new password');
});

test('CaptureScreen shows saving message and disables controls when busy', () => {
  const tree = render(
    <CaptureScreen busy onClose={noop} onCapture={noop} onPickImage={noop} onFlip={noop} />,
  );
  const content = texts(tree);
  expect(content).toContain('Saving photo locally');

  // The native controls are disabled while the container owns the one active
  // capture/save operation, so a second press cannot enqueue another scan.
  const buttons = tree.root.findAll(node => node.props.accessibilityRole === 'button');
  buttons.forEach((b: any) => {
    const isDisabled = b.props.disabled === true || b.props.accessibilityState?.disabled === true;
    expect({ label: b.props.accessibilityLabel, disabled: isDisabled }).toEqual({ label: b.props.accessibilityLabel, disabled: true });
  });
});

test('CaptureScreen shows error overlay with Retry when saving fails', () => {
  const onRetry = jest.fn();
  const onPickImage = jest.fn();
  const tree = render(
    <CaptureScreen error="Could not save the photo locally." onClose={noop} onCapture={noop} onPickImage={onPickImage} onFlip={noop} onRetry={onRetry} />,
  );
  const content = texts(tree);
  expect(content).toContain('Could not save the photo locally.');
  expect(content).toContain('Try again');
  expect(content).toContain('Choose another photo');
  act(() => {
    findPressable(tree, 'Try again').props.onPress();
    findPressable(tree, 'Choose another photo').props.onPress();
  });
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(onPickImage).toHaveBeenCalledTimes(1);
});

test('CameraCapture retries the same local URI and rejects duplicate capture presses', async () => {
  const onCaptured = jest.fn()
    .mockRejectedValueOnce(new Error('disk error'))
    .mockResolvedValueOnce(undefined);
  const tree = render(<CameraCapture onClose={noop} onCaptured={onCaptured} />);
  const shutter = findPressable(tree, 'Take photo');

  await act(async () => {
    await Promise.all([shutter.props.onPress(), shutter.props.onPress()]);
  });
  expect(onCaptured).toHaveBeenCalledTimes(1);
  expect(onCaptured).toHaveBeenCalledWith('file:///test/photo.jpg');
  expect(texts(tree)).toContain('Could not save photo locally.');

  await act(async () => {
    findPressable(tree, 'Try again').props.onPress();
    await Promise.resolve();
  });
  expect(onCaptured).toHaveBeenCalledTimes(2);
  expect(onCaptured).toHaveBeenLastCalledWith('file:///test/photo.jpg');
  expect(texts(tree)).not.toContain('Could not save photo locally.');
});

test('CaptureResultScreen shows truthful no-model result and actionable pathways', () => {
  const onReviewPhoto = jest.fn();
  const onBrowseGuidance = jest.fn();
  const onStartMonitoring = jest.fn();
  const tree = render(
    <CaptureResultScreen
      photoUri="file:///fake.jpg"
      onReviewPhoto={onReviewPhoto}
      onBrowseGuidance={onBrowseGuidance}
      onStartMonitoring={onStartMonitoring}
      onBackToSummary={noop}
    />,
  );
  const content = texts(tree);
  expect(content).toContain('Disease Diagnosis: No Model Weights');
  expect(content).toContain('Photo retained in local SQLite repository');
  expect(content).toContain('Browse Local Crop Knowledge');
  expect(content).toContain('Start Manual Monitoring Session');

  act(() => {
    findPressable(tree, 'Browse Local Crop Knowledge').props.onPress();
    findPressable(tree, 'Start Manual Monitoring Session').props.onPress();
  });
  expect(onBrowseGuidance).toHaveBeenCalledTimes(1);
  expect(onStartMonitoring).toHaveBeenCalledTimes(1);

  // Must not contain prohibited claims
  expect(content).not.toContain('Severity');
  expect(content).not.toContain('Confidence');
});

test('CaptureResultScreen photo review returns to its truthful summary', () => {
  const onBackToSummary = jest.fn();
  const tree = render(
    <CaptureResultScreen
      photoUri="file:///fake.jpg"
      view="photo"
      onReviewPhoto={noop}
      onBrowseGuidance={noop}
      onStartMonitoring={noop}
      onBackToSummary={onBackToSummary}
    />,
  );
  expect(texts(tree)).toContain('Back to summary');
  act(() => {
    findPressable(tree, 'Back to summary').props.onPress();
  });
  expect(onBackToSummary).toHaveBeenCalledTimes(1);
});

test('capture and no-model result copy is supplied in Filipino', () => {
  const tree = render(
    <LanguageProvider language="FIL">
      <CaptureResultScreen
        photoUri="file:///fake.jpg"
        onReviewPhoto={noop}
        onBrowseGuidance={noop}
        onStartMonitoring={noop}
        onBackToSummary={noop}
      />
    </LanguageProvider>,
  );
  const content = texts(tree);
  expect(content).toContain('Pagsusuri sa Sakit: Walang Model Weights');
  expect(content).toContain('Litrato naka-save sa lokal na SQLite repository');
  expect(content).toContain('Sumangguni sa Gabay ng Pananim');
});

test('History renders a model-free row with its local thumbnail, date, fruit and truthful status', () => {
  const onOpenScan = jest.fn();
  const tree = render(
    <HistoryScreen
      groups={[{
        label: 'TODAY',
        scans: [{
          id: 'scan-1', imageUri: 'file:///owned/mango.jpg', emoji: '🥭',
          title: 'Mango', status: 'undetermined', detail: 'No disease model', timeLabel: '09:15', fruitKey: 'mango',
        }],
      }]}
      filters={[{ key: 'All', label: 'All' }]}
      activeFilterKey="All"
      totalLabel="1 scan stored on this device"
      query={null}
      onChangeQuery={noop}
      onFilter={noop}
      onOpenScan={onOpenScan}
    />,
  );
  const content = texts(tree);
  expect(content).toContain('Mango');
  expect(content).toContain('09:15');
  expect(content).toContain('Local');
  expect(content).toContain('No disease model');
  expect(tree.root.find(node => node.props.source?.uri === 'file:///owned/mango.jpg')).toBeTruthy();
  act(() => {
    findPressable(tree, 'Mango').props.onPress();
  });
  expect(onOpenScan).toHaveBeenCalledWith('scan-1');
});

test('History keeps its existing rows visible for loading, offline, and sanitized-error states', () => {
  const scans = [{
    id: 'scan-1', imageUri: 'file:///owned/mango.jpg', emoji: '🥭',
    title: 'Mango', status: 'undetermined' as const, detail: 'No disease model', timeLabel: '09:15', fruitKey: 'mango',
  }];
  const base = {
    groups: [{ label: 'TODAY', scans }], filters: [{ key: 'All', label: 'All' }], activeFilterKey: 'All',
    totalLabel: '1 scan stored on this device', query: null, onChangeQuery: noop, onFilter: noop, onOpenScan: noop,
  };
  expect(texts(render(<HistoryScreen {...base} loading />))).toContain('Loading…');
  expect(texts(render(<HistoryScreen {...base} offline />))).toContain('Persisted locally on device SQLite');
  const onRetry = jest.fn();
  const errorTree = render(<HistoryScreen {...base} error="file:///private/path" onRetry={onRetry} />);
  const errorContent = texts(errorTree);
  expect(errorContent).toContain('Could not read saved scan history.');
  expect(errorContent).toContain('Mango');
  expect(errorContent).not.toContain('file:///private/path');
  act(() => {
    findPressable(errorTree, 'Try again').props.onPress();
  });
  expect(onRetry).toHaveBeenCalledTimes(1);
});
