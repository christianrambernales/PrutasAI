import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ChatScreen, type ChatScreenProps } from '../chat/ChatScreen';
import { ClimateScreen, type ClimateScreenProps } from '../climate/ClimateScreen';
import { HistoryScreen, type HistoryScreenProps } from '../history/HistoryScreen';
import { HomeScreen, type HomeScreenProps } from '../home/HomeScreen';
import { TabBar } from '../../navigation/render/tabs';
import type { Shell } from '../../navigation/shell';
import * as preview from '../../preview/previewContent';
import { COLORS, LanguageProvider, strings } from '../../ui';
import { textOf } from '../../testing/interaction';

type Language = 'EN' | 'FIL';
const noop = () => undefined;

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(element); });
  return tree;
}

function byLabel(tree: ReactTestRenderer, label: string) {
  const matches = tree.root.findAll(n => n.props.accessibilityLabel === label);
  const node = matches[matches.length - 1];
  if (!node) throw new Error(`No accessible element named "${label}"`);
  return node;
}

function textNode(tree: ReactTestRenderer, text: string) {
  const node = tree.root.findAll(n => n.props.children === text && n.props.color !== undefined)[0];
  if (!node) throw new Error(`No styled text node contains "${text}"`);
  return node;
}

function flattenedStyle(value: unknown) {
  const resolved = typeof value === 'function' ? value({ pressed: false }) : value;
  const entries = Array.isArray(resolved) ? resolved : [resolved];
  return Object.assign({}, ...entries.filter(entry => entry && typeof entry === 'object')) as Record<string, unknown>;
}

function homeProps(language: Language): HomeScreenProps {
  return {
    capabilityHeadline: 'Model status', capabilityDetail: 'Inference is unverified.',
    readyModelCount: 0, totalModelCount: 0, fruits: preview.FRUITS,
    climate: null, recentScans: [], language,
    onToggleLanguage: noop, onSetLocation: noop, onScan: noop, onOpenFruit: noop,
    onOpenScan: noop, onOpenSettings: noop, onOpenClimate: noop, onViewAllScans: noop,
    onOpenChat: noop, onOpenMonitoring: noop,
  };
}

function renderHome(language: Language) {
  return render(
    <LanguageProvider language={language}>
      <HomeScreen {...homeProps(language)} />
    </LanguageProvider>,
  );
}

function climateProps(): ClimateScreenProps {
  return {
    climate: preview.CLIMATE, normals: preview.NORMALS, suitability: preview.SUITABILITY,
    fruits: preview.FRUITS, selectedFruitKey: 'banana', status: 'ready', currentStatus: 'ready',
    error: null, hasLocation: true, onSelectFruit: noop, onChangeLocation: noop, onRetry: noop,
  };
}

function renderClimate(language: Language, overrides: Partial<ClimateScreenProps> = {}) {
  return render(
    <LanguageProvider language={language}>
      <ClimateScreen {...climateProps()} {...overrides} />
    </LanguageProvider>,
  );
}

function chatProps(): ChatScreenProps {
  return {
    messages: [], suggestions: [], curatedWording: false, draft: '', pending: false,
    onChangeDraft: noop, onSend: noop, onSuggestion: noop,
  };
}

function historyProps(language: Language): HistoryScreenProps {
  const t = strings(language);
  return {
    groups: [], filters: [{ key: 'all', label: t.filterAll }, { key: 'diseased', label: t.filterDiseased }],
    activeFilterKey: 'all', totalLabel: t.scansShown(0, 0), query: null,
    onChangeQuery: noop, onFilter: noop, onOpenScan: noop, onScan: noop,
  };
}

test.each(['EN', 'FIL'] as const)('F-07-03-01 (R03) Home names language, bilingual fruit actions, and readable copy in %s', language => {
  const tree = renderHome(language);
  const t = strings(language);
  const banana = preview.FRUITS.find(fruit => fruit.key === 'banana')!;

  expect(byLabel(tree, t.prototypeViewHistory).props.accessibilityRole).toBe('button');
  expect(byLabel(tree, language === 'FIL' ? banana.nameFil : banana.nameEn).props.accessibilityRole).toBe('button');

  const locationLoading = render(
    <LanguageProvider language={language}>
      <HomeScreen {...homeProps(language)} climateLoading />
    </LanguageProvider>,
  );
  expect(byLabel(locationLoading, `${t.setLocation}. ${t.fetchingWeather}`).props.accessibilityRole).toBe('button');

  expect(textOf(tree.root)).toContain(t.prototypeTakeChoosePhoto);
  expect(textOf(tree.root)).toContain(t.prototypePhotoStorageBlurb);
});

test.each(['EN', 'FIL'] as const)('F-07-03-02 (R04) Climate localizes layout and announces loading/error without provider details in %s', language => {
  const t = strings(language);
  const loading = renderClimate(language, { climate: null, status: 'loading', currentStatus: 'loading' });
  const progress = loading.root.find(node => node.props.accessibilityRole === 'progressbar');
  expect(progress.props.accessibilityState).toMatchObject({ busy: true });
  expect(progress.props.accessibilityLiveRegion).toBe('polite');
  expect(textOf(loading.root)).toContain(t.fetchingWeather);
  expect(textNode(loading, t.fetchingConditions).props.color).toBe(COLORS.textSecondary);

  const failed = renderClimate(language, {
    status: 'error', currentStatus: 'error', error: 'https://private.invalid/?token=secret',
  });
  const alert = failed.root.find(node => node.props.accessibilityRole === 'alert');
  expect(alert.props.accessibilityLiveRegion).toBe('polite');
  expect(byLabel(failed, t.tryAgain).props.accessibilityRole).toBe('button');
  expect(textOf(failed.root)).not.toContain('secret');

  const ready = renderClimate(language);
  const changeLabel = language === 'FIL' ? 'Palitan ang lokasyon' : 'Change location';
  expect(byLabel(ready, changeLabel).props.accessibilityRole).toBe('button');
  const histogram = ready.root.find(node => node.props.accessibilityLabel === '12-Month rainfall histogram');
  expect(histogram.props.accessibilityRole).toBe('image');
  const expectedSuitability = language === 'FIL' ? 'Mangga: Angkop sa Kasalukuyan' : 'Mango: Highly Suitable';
  expect(textNode(ready, expectedSuitability).props.color).toBe(COLORS.primary);
});

test.each(['EN', 'FIL'] as const)('F-07-03-03 (R05) Chat exposes pending, retry, send and conversation actions in %s', language => {
  const t = strings(language);
  const chat = chatProps();
  const screen = render(
    <LanguageProvider language={language}>
      <ChatScreen {...chat} pending />
    </LanguageProvider>,
  );
  const progress = screen.root.find(node => node.props.accessibilityRole === 'progressbar');
  expect(progress.props.accessibilityLabel).toBe(t.titleAssistant);
  expect(progress.props.accessibilityState).toMatchObject({ busy: true });
  expect(progress.props.accessibilityLiveRegion).toBe('polite');

  const send = byLabel(screen, t.send);
  expect(send.props.accessibilityState).toMatchObject({ disabled: true });
  expect(flattenedStyle(send.props.style).minWidth).toBe(48);

  const retryScreen = render(
    <LanguageProvider language={language}>
      <ChatScreen {...chat} onRetry={noop} />
    </LanguageProvider>,
  );
  expect(flattenedStyle(byLabel(retryScreen, t.retry).props.style).minHeight).toBe(48);

  const drawerScreen = render(
    <LanguageProvider language={language}>
      <ChatScreen {...chat} onOpenDrawer={noop} onNewChat={noop} />
    </LanguageProvider>,
  );
  const conversations = byLabel(drawerScreen, t.chatConversations);
  expect(conversations.props.accessibilityRole).toBe('button');
  expect(flattenedStyle(conversations.props.style).minHeight).toBeGreaterThanOrEqual(48);
  const newChat = byLabel(drawerScreen, t.newConversation);
  expect(newChat.props.accessibilityRole).toBe('button');
  expect(flattenedStyle(newChat.props.style).minHeight).toBeGreaterThanOrEqual(48);
});

test.each(['EN', 'FIL'] as const)('F-07-03-04 (R06) History labels search and announces selected, empty, loading and error states in %s', language => {
  const t = strings(language);
  const base = historyProps(language);
  const search = render(
    <LanguageProvider language={language}>
      <HistoryScreen {...base} query="banana" />
    </LanguageProvider>,
  );
  expect(byLabel(search, t.searchScans).props.accessibilityRole).toBe('search');
  expect(byLabel(search, t.filterAll).props.accessibilityState).toMatchObject({ selected: true });

  const empty = render(
    <LanguageProvider language={language}>
      <HistoryScreen {...base} allCount={1} />
    </LanguageProvider>,
  );
  expect(textNode(empty, t.noScansYetBlurb).props.color).toBe(COLORS.textSecondary);

  const loading = render(
    <LanguageProvider language={language}>
      <HistoryScreen {...base} loading />
    </LanguageProvider>,
  );
  const progress = loading.root.find(node => node.props.accessibilityRole === 'progressbar');
  expect(progress.props.accessibilityState).toMatchObject({ busy: true });
  expect(progress.props.accessibilityLiveRegion).toBe('polite');

  const failed = render(
    <LanguageProvider language={language}>
      <HistoryScreen {...base} error="file:///private/path" />
    </LanguageProvider>,
  );
  const alert = failed.root.find(node => node.props.accessibilityRole === 'alert');
  expect(alert.props.accessibilityLiveRegion).toBe('polite');
  expect(textOf(failed.root)).not.toContain('/private/path');
});
