/**
 * The climate feature end to end, through the navigator.
 *
 * Open-Meteo is stubbed at `fetch` rather than at the module boundary, so the
 * URL construction and response parsing are both exercised — the previous round
 * shipped a dead Gemini model precisely because the mocks sat above the code
 * that was wrong.
 */

import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

import { AppNavigator } from '../../navigation/AppNavigator';
import { resetAppDatabase, seedConsent, seedLanguagePicked, seedSyncMode } from '../../testing/appDatabase';
import { press, textOf, typeInto } from '../../testing/interaction';

const CURRENT = {
  latitude: 7.07,
  longitude: 125.61,
  elevation: 22,
  current: {
    time: '2026-08-11T10:30',
    temperature_2m: 31.4,
    relative_humidity_2m: 68,
    apparent_temperature: 37.2,
    precipitation: 0,
    weather_code: 2,
  },
};

function archiveDays() {
  // Two whole years, one reading a month, wet second half of the year.
  const time: string[] = [];
  const precipitation_sum: number[] = [];
  const temperature_2m_mean: number[] = [];
  for (const year of [2023, 2024]) {
    for (let m = 1; m <= 12; m++) {
      time.push(`${year}-${String(m).padStart(2, '0')}-15`);
      precipitation_sum.push(m >= 6 ? 220 : 40);
      temperature_2m_mean.push(27);
    }
  }
  return { time, precipitation_sum, temperature_2m_mean };
}

let fetchCalls: string[] = [];
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

beforeEach(() => {
  resetAppDatabase();
  seedLanguagePicked();
  seedConsent();
  seedSyncMode();
  fetchCalls = [];
  global.fetch = (async (url: string) => {
    fetchCalls.push(String(url));
    const body = String(url).includes('archive-api')
      ? { daily: archiveDays() }
      : CURRENT;
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
});

function render(): ReactTestRenderer {
  act(() => {
    currentTree = renderer.create(<AppNavigator />);
  });
  return currentTree!;
}

function screenText(tree: ReactTestRenderer): string {
  return textOf(tree.root);
}

/** Choose a place and let both Open-Meteo promises settle. */
async function chooseDavao(tree: ReactTestRenderer) {
  press(tree, 'Davao City');
  press(tree, 'Change location');
  press(tree, 'Davao City, Davao del Sur');
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

test('with no location the climate screen avoids inventing Los Baños live readings or fetching', () => {
  const tree = render();
  press(tree, 'Davao City');

  const content = screenText(tree);
  expect(content).toContain('Climate & Suitability');
  expect(content).not.toContain('Los Ba');
  expect(fetchCalls).toEqual([]);
});

test('nothing is fetched until the user picks a place', () => {
  render();
  expect(fetchCalls).toEqual([]);
});

test('choosing a location fetches and shows real conditions', async () => {
  const tree = render();
  await chooseDavao(tree);

  const content = screenText(tree);
  expect(content).toContain('Davao City, Davao del Sur');
  expect(content).toContain('68%');
  expect(content).toContain('0 mm');
  expect(content).toContain('22 m');
});

test('both endpoints are called with the chosen coordinates and no API key', async () => {
  const tree = render();
  await chooseDavao(tree);

  expect(fetchCalls.some(u => u.includes('api.open-meteo.com/v1/forecast'))).toBe(true);
  expect(fetchCalls.some(u => u.includes('archive-api.open-meteo.com'))).toBe(true);
  for (const url of fetchCalls) {
    expect(url).toContain('latitude=7.07');
    expect(url.toLowerCase()).not.toContain('key=');
  }
});

test('fetched normals populate the 12-month rainfall histogram', async () => {
  const tree = render();
  await chooseDavao(tree);

  const content = screenText(tree);
  expect(content).toContain('12-Month Rainfall Normals');
  const histogram = tree.root.find(node => node.props.accessibilityLabel === '12-Month rainfall histogram');
  expect(histogram).toBeTruthy();
});

test('returning home after fetching updates the live home climate card', async () => {
  const tree = render();
  await chooseDavao(tree);
  press(tree, 'Back to Home');

  const homeText = screenText(tree);
  expect(homeText).toContain('Davao City, Davao del Sur');
  expect(homeText).toContain('31°C');
});

test('a failed fetch reports the failure instead of showing stale data as live', async () => {
  global.fetch = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;

  const tree = render();
  await chooseDavao(tree);

  const content = screenText(tree);
  expect(content).toContain('Climate data unavailable');
  expect(content).toContain('Try again');
});

test('the assistant answers suitability from the fetched normals', async () => {
  const tree = render();
  await chooseDavao(tree);

  press(tree, 'Assistant');
  typeInto(tree, 'Ask about a fruit', 'Is Davao suitable for banana?');
  press(tree, 'Send');
  const content = screenText(tree);
  expect(content).toContain('Potentially suitable');
  expect(content).toContain('1,740 mm');
});
