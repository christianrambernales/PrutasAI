import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TabKey, Route } from '../navState';
import { TabBody } from '../render/tabs';
import { RouteBody } from '../render/routes';
import { makeShell } from '../../testing/shellFixture';
import { textOf, findPressable } from '../../testing/interaction';

type ExhaustiveTabKey = Record<TabKey, true>;
const LIVE_TABS: ExhaustiveTabKey = {
  home: true,
  monitoring: true,
  chat: true,
  account: true,
};

type ExhaustiveRouteName = Record<Route['name'], true>;
const LIVE_ROUTES: ExhaustiveRouteName = {
  capture: true,
  captureResult: true,
  result: true,
  varietyInfo: true,
  monitoring: true,
  settings: true,
  modelStatus: true,
  locationPicker: true,
  account: true,
  signup: true,
  trash: true,
  resetPassword: true,
  history: true,
  climate: true,
  login: true,
  forgotPassword: true,
};

test('Exhaustive tab matrix', () => {
  expect(Object.keys(LIVE_TABS)).toHaveLength(4);
});

test('Exhaustive route matrix', () => {
  expect(Object.keys(LIVE_ROUTES)).toHaveLength(16);
});

describe('Climate route states', () => {
  function renderClimate(customize: (shell: ReturnType<typeof makeShell>) => void) {
    let tree!: ReactTestRenderer;
    const shell = makeShell();
    customize(shell);
    act(() => {
      tree = renderer.create(<RouteBody shell={shell} route={{ name: 'climate' }} />);
    });
    return { tree, text: textOf(tree.root), shell };
  }

  test('no-location state renders prototype default location with Change location action', () => {
    const { text, tree, shell } = renderClimate(s => {
      s.app.savedLocation = null;
      s.nav.push = jest.fn();
    });
    expect(text).toContain('Climate & Suitability');
    expect(text).toContain('Davao City, Region XI');
    expect(text).not.toContain('No location set');
    
    act(() => {
      findPressable(tree, 'Change location').props.onPress();
    });
    expect(shell.nav.push).toHaveBeenCalledWith({ name: 'locationPicker' });
  });

  test('loading state without prior data', () => {
    const { text } = renderClimate(s => {
      s.app.savedLocation = { latitude: 14.5, longitude: 121, label: 'Manila' };
      s.climate.climate.status = 'loading';
      s.climate.snapshot = null;
      s.climate.normals = null;
    });
    expect(text).toContain('Fetching current conditions');
    // Ensure we don't invent a positive verdict during loading
    expect(text).not.toContain('You can grow');
  });

  test('current-data unavailable with local/historical explanation and sanitized error', () => {
    const { text, tree, shell } = renderClimate(s => {
      s.app.savedLocation = { latitude: 14.5, longitude: 121, label: 'Manila' };
      s.climate.climate.status = 'error';
      s.climate.climate.error = 'Provider error 500 at https://private.example/token';
      s.climate.snapshot = null;
      s.climate.climate.refresh = jest.fn();
    });
    expect(text).toContain('Climate data unavailable');
    expect(text).toContain('Could not reach the climate service');
    expect(text).not.toContain('private.example');
    
    act(() => {
      findPressable(tree, 'Try again').props.onPress();
    });
    expect(shell.climate.climate.refresh).toHaveBeenCalled();
  });

  test('cached/offline evidence is shown when available and status is error', () => {
    const { text } = renderClimate(s => {
      s.app.savedLocation = { latitude: 14.5, longitude: 121, label: 'Manila' };
      s.climate.climate.status = 'error';
      s.climate.snapshot = {
        temperatureC: 30,
        condition: 'Clear',
        feelsLikeLabel: 'Feels like 32',
        humidityPct: 60,
        rainTodayMm: 0,
        elevationM: 10,
        place: 'Manila',
        coordsLabel: '14.5, 121.0',
        freshnessLabel: '2 h ago',
        freshness: 'stale',
      };
    });
    expect(text).toContain('Climate data unavailable');
    expect(text).toContain('Showing the last reading');
    expect(text).toContain('2 h ago');
  });
});

describe('VarietyInfo route states', () => {
  function renderVarietyInfo(
    fruitKey: string,
    customize: (shell: ReturnType<typeof makeShell>) => void,
  ) {
    let tree!: ReactTestRenderer;
    const shell = makeShell();
    customize(shell);
    act(() => {
      tree = renderer.create(<RouteBody shell={shell} route={{ name: 'varietyInfo', fruitKey }} />);
    });
    return { tree, text: textOf(tree.root), shell };
  }

  test('unknown/missing compiled content with safe Back action', () => {
    const { text, tree, shell } = renderVarietyInfo('missing', s => {
      s.data.fruits = [];
      s.nav.back = jest.fn();
    });
    expect(text).toContain('Missing local content');
    
    act(() => {
      findPressable(tree, 'Go back').props.onPress();
    });
    expect(shell.nav.back).toHaveBeenCalled();
  });

  test('known crop route wires selectedCrop, onSelectCrop, onScanCrop, and onBackHome', () => {
    const { text, tree, shell } = renderVarietyInfo('papaya', s => {
      s.data.fruits = [
        { key: 'papaya', emoji: '🍈', nameEn: 'Papaya', nameFil: 'Papaya', varietyCount: 2 },
      ];
      s.nav.replace = jest.fn();
      s.nav.push = jest.fn();
      s.nav.selectTab = jest.fn();
    });
    expect(text).toContain('Red Lady Papaya');
    expect(text).toContain('Agronomic Thresholds');

    act(() => {
      findPressable(tree, '🍌 Banana').props.onPress();
      findPressable(tree, 'Scan this Crop').props.onPress();
      findPressable(tree, '← Home').props.onPress();
    });
    expect(shell.nav.replace).toHaveBeenCalledWith({ name: 'varietyInfo', fruitKey: 'banana' });
    expect(shell.nav.push).toHaveBeenCalledWith({ name: 'capture' });
    expect(shell.nav.selectTab).toHaveBeenCalledWith('home');
  });
});
