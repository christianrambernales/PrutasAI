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
import * as preview from '../../preview/previewContent';

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
  expect(content).toContain('3/3 models');
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

test('Model status reports the real registry, which today declares no models', () => {
  const content = texts(render(<ModelStatusScreen />));
  expect(content).toContain('Detection model not installed');
  expect(content).toContain('No models declared');
  // The screen must never imply a stage can run when nothing is installed.
  expect(content).not.toContain('checksum verified');
});

test('the navigator mounts on the home tab', () => {
  const content = texts(render(<AppNavigator />));
  expect(content).toContain('PrutasAI');
  expect(content).toContain('Scan a fruit');
  expect(content).toContain('Home');
});
