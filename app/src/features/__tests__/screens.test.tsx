import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { resetAppDatabase, seedConsent, seedLanguagePicked, seedSyncMode } from '../../testing/appDatabase';
import { CaptureScreen } from '../capture/CaptureScreen';
import { ChatScreen } from '../chat/ChatScreen';
import { ClimateScreen } from '../climate/ClimateScreen';
import { HistoryScreen } from '../history/HistoryScreen';
import { HomeScreen } from '../home/HomeScreen';
import { ModelStatusScreen } from '../modelStatus/ModelStatusScreen';
import { MonitoringScreen } from '../monitoring/MonitoringScreen';
import { ResultScreen } from '../result/ResultScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { VarietyInfoScreen } from '../varietyInfo/VarietyInfoScreen';
import { ResetPasswordScreen } from '../account/ResetPasswordScreen';
import { routeTitle, RouteBody } from '../../navigation/render/routes';
import { makeShell } from '../../testing/shellFixture';
import { strings } from '../../ui/i18n/strings';
import * as preview from '../../preview/previewContent';
import { LanguageProvider } from '../../ui';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
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

const noop = () => {};

beforeEach(() => {
  resetAppDatabase();
  seedLanguagePicked();
  seedConsent();
  seedSyncMode();
});

test('Home renders the capability headline it is given', () => {
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
  expect(content).toContain('Fruit, variety and disease');
  expect(content).toContain('Banana');
  expect(content).toContain('3 of 3 declared model files build-validated');
});

test('Capture shows the framing hint and the on-device promise', () => {
  const content = texts(
    render(<CaptureScreen onClose={noop} onCapture={noop} onPickImage={noop} onFlip={noop} />),
  );
  expect(content).toContain('Center the fruit in the frame');
  // The old copy claimed nothing was uploaded at all, which stopped being true
  // when anonymous scans began syncing. What is still true, and is the point, is
  // that the photograph never leaves the phone.
  expect(content).toContain('Your photo never leaves it');
});

test('Result shows all three pipeline stages with their confidences', () => {
  const content = texts(
    render(<ResultScreen result={preview.RESULT} onStartMonitoring={noop} onAskAssistant={noop} />),
  );
  expect(content).toContain('STAGE 1 · FRUIT');
  expect(content).toContain('STAGE 2 · VARIETY');
  expect(content).toContain('STAGE 3 · DISEASE');
  expect(content).toContain('0.96');
});

test('Result labels an uncited remedy as unverified', () => {
  const content = texts(
    render(<ResultScreen result={preview.RESULT} onStartMonitoring={noop} onAskAssistant={noop} />),
  );
  expect(content).toContain('Unverified');
});

test('Result omits the severity scale when no fruit box was produced', () => {
  const content = texts(
    render(
      <ResultScreen
        result={{ ...preview.RESULT, severityLabel: 'undetermined', severityPercent: null }}
        onStartMonitoring={noop}
        onAskAssistant={noop}
      />,
    ),
  );
  expect(content).toContain('severity is not computed');
});

test('Variety info separates model classes from information-only strains', () => {
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
  expect(content).toContain('Identified by the model');
  expect(content).toContain('Information only');
  expect(content).toContain('MMSU Gold');
  expect(content).toContain('never');
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

test('Climate shows the verdict and one row per evidence parameter', () => {
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
  expect(content).toContain('Potentially suitable');
  expect(content).toContain('Mean temperature');
  expect(content).toContain('Annual rainfall');
  expect(content).toContain('Elevation');
  expect(content).toContain('tolerated');
});

test('Chat renders the conversation and explains curated wording without claiming to be offline', () => {
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
  expect(content).toContain('curated templates');
  // The banner used to read "No connection", which was false for every user
  // who simply had online phrasing switched off — the default.
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

test('History groups scans by recency', () => {
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
  expect(content).toContain('TODAY');
  expect(content).toContain('THIS WEEK');
  expect(content).toContain('6 scans stored on this device');
});

test('History shows an empty state rather than an empty list', () => {
  const content = texts(
    render(
      <HistoryScreen
        groups={[{ label: 'TODAY', scans: [] }]}
        filters={[{ key: 'All', label: 'All' }]}
        activeFilterKey="All"
        totalLabel="0 scans"
        query={null}
        onChangeQuery={noop}
        onFilter={noop}
        onOpenScan={noop}
      />,
    ),
  );
  expect(content).toContain('No scans yet');
});

test('Monitoring renders every checkpoint including the one still due', () => {
  const content = texts(
    render(
      <MonitoringScreen session={preview.SESSION} expandedCheckpointDay={null} onScanCheckpoint={noop} onOpenCheckpoint={noop} />,
    ),
  );
  expect(content).toContain('Day 0');
  expect(content).toContain('Day 5');
  expect(content).toContain('Day 10');
  expect(content).toContain('Scan checkpoint');
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

test('Model status reports the real empty registry and keeps inference unverified', () => {
  const content = texts(render(<ModelStatusScreen language="EN" />));
  expect(content).toContain('No validated model files are installed');
  expect(content).toContain('No models declared');
  expect(content).toContain('Inference unverified');
  expect(content).toContain('How to import models');
  expect(content).not.toContain('Import a model file');
});

test('Model status screen renders Filipino copy', () => {
  const content = texts(render(<ModelStatusScreen language="FIL" />));
  expect(content).toContain('Hindi pa napatutunayan ang inference');
  expect(content).toContain('Paano mag-import ng mga modelo');
  expect(content).toContain('Walang modelong nakasaad');
});

test('the navigator mounts on the home tab', () => {
  const content = texts(render(<AppNavigator />));
  expect(content).toContain('PrutasAI');
  expect(content).toContain('Scan a fruit');
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
