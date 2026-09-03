import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useHistoryFilters, matchesFilter, matchesQuery } from '../useHistoryFilters';
import { strings } from '../../../ui/i18n/strings';
import type { ScanGroup, ScanSummary } from '../../viewModels';

const t = strings('EN');

function scan(over: Partial<ScanSummary>): ScanSummary {
  return {
    id: 's1', emoji: '🍌', title: 'Banana · Lakatan', status: 'healthy',
    detail: 'No disease found', timeLabel: 'Today', ...over,
  };
}

const GROUPS: ScanGroup[] = [
  { label: 'Today', scans: [
    scan({ id: 's1', title: 'Banana · Lakatan', status: 'healthy' }),
    scan({ id: 's2', title: 'Mango · Carabao', status: 'severe', detail: 'Anthracnose' }),
  ] },
  { label: 'Earlier', scans: [
    scan({ id: 's3', title: 'Papaya · Solo', status: 'early', detail: 'Ringspot' }),
  ] },
];
const ALL = GROUPS.flatMap(g => g.scans);

function run(historyFilter: string, historyQuery: string | null) {
  let value!: ReturnType<typeof useHistoryFilters>;
  function Host() {
    value = useHistoryFilters({ scanGroups: GROUPS, allScans: ALL, historyFilter, historyQuery, t });
    return null;
  }
  act(() => { renderer.create(<Host />); });
  return value;
}

test('a filter key selects scans regardless of the translated label', () => {
  expect(matchesFilter(scan({ title: 'Mango · Carabao' }), 'Mango')).toBe(true);
  expect(matchesFilter(scan({ title: 'Banana · Lakatan' }), 'Mango')).toBe(false);
  expect(matchesFilter(scan({ status: 'severe' }), 'Diseased')).toBe(true);
  expect(matchesFilter(scan({ status: 'healthy' }), 'Diseased')).toBe(false);
  expect(matchesFilter(scan({}), 'All')).toBe(true);
});

test('an empty query matches everything; otherwise title and detail are searched', () => {
  expect(matchesQuery(scan({}), '   ')).toBe(true);
  expect(matchesQuery(scan({ detail: 'Anthracnose' }), 'anthrac')).toBe(true);
  expect(matchesQuery(scan({ title: 'Mango · Carabao' }), 'carabao')).toBe(true);
  expect(matchesQuery(scan({}), 'nothing-like-this')).toBe(false);
});

test('every filter chip carries its own count', () => {
  const { filters } = run('All', null);
  expect(filters.map(f => f.key)).toEqual(['All', 'Banana', 'Mango', 'Papaya', 'Diseased']);
  expect(filters.find(f => f.key === 'All')!.label).toContain('· 3');
  expect(filters.find(f => f.key === 'Diseased')!.label).toContain('· 2');
  expect(filters.find(f => f.key === 'Banana')!.label).toContain('· 1');
});

test('filtering keeps the group structure and reports the visible total', () => {
  const { visibleGroups, visibleCount } = run('Mango', null);
  expect(visibleGroups.map(g => g.label)).toEqual(['Today', 'Earlier']);
  expect(visibleGroups[0].scans.map(s => s.id)).toEqual(['s2']);
  expect(visibleGroups[1].scans).toEqual([]);
  expect(visibleCount).toBe(1);
});

test('a null query is treated as empty rather than matching nothing', () => {
  expect(run('All', null).visibleCount).toBe(3);
});
