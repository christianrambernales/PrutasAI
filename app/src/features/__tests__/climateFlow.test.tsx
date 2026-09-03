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
import { press, textOf } from '../../testing/interaction';

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
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<AppNavigator />);
  });
  return tree;
}

function screenText(tree: ReactTestRenderer): string {
  return textOf(tree.root);
}

/** Choose a place and let both Open-Meteo promises settle. */
async function chooseDavao(tree: ReactTestRenderer) {
  press(tree, 'Climate');
  press(tree, 'Choose a location');
  press(tree, 'Davao City, Davao del Sur');
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

test('with no location the climate tab asks for one instead of inventing weather', () => {
  const tree = render();
  press(tree, 'Climate');

  const content = screenText(tree);
  expect(content).toContain('No location set');
  // The old build showed Los Baños at 31° as fact before any fetch happened.
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
  expect(content).toContain('Davao City');
  expect(content).toContain('31');
  expect(content).toContain('Partly cloudy');
  expect(content).toContain('68%');
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

test('the verdict is computed from the fetched normals, not from preview data', async () => {
  const tree = render();
  await chooseDavao(tree);

  const content = screenText(tree);
  // Seven wet months at 220 mm plus five dry at 40 mm = 1,740 mm — inside
  // banana's tolerated band but under its 1,800 mm optimal, so the verdict
  // must be "potentially suitable" rather than "suitable".
  expect(content).toContain('1,740 mm');
  expect(content).toContain('Potentially suitable');
  expect(content).toContain('outside optimal on annual rainfall');
  expect(content).toContain('2023–2024');
});

test('a fruit with different requirements gets a different verdict from the same climate', async () => {
  const tree = render();
  await chooseDavao(tree);

  const banana = screenText(tree);
  press(tree, 'Mango');
  const mango = screenText(tree);

  // 1,560mm is optimal-ish for banana but above mango's 750–1,500 optimal.
  expect(mango).not.toBe(banana);
  expect(mango).toContain('750');
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

  press(tree, 'Chat');
  press(tree, 'Anong mga uri ng saging?');
  expect(screenText(tree)).toContain('Lakatan');
});
