import { useMemo } from 'react';
import type { ScanGroup, ScanSummary } from '../viewModels';
import type { strings } from '../../ui/i18n/strings';

type Strings = ReturnType<typeof strings>;

const DISEASED = ['early', 'moderate', 'severe'];

/**
 * History filters are keyed independently of their labels, so a translated
 * label ("May sakit") still selects the same scans as the English one.
 */
export const FILTER_KEYS = ['All', 'Banana', 'Mango', 'Papaya', 'Diseased'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export function matchesFilter(scan: ScanSummary, key: string): boolean {
  if (key === 'All') return true;
  if (key === 'Diseased') return DISEASED.includes(scan.status);
  return scan.title.toLowerCase().startsWith(key.toLowerCase());
}

export function matchesQuery(scan: ScanSummary, query: string): boolean {
  if (query.trim() === '') return true;
  return `${scan.title} ${scan.detail}`.toLowerCase().includes(query.trim().toLowerCase());
}

export interface HistoryFiltersInput {
  scanGroups: ScanGroup[];
  allScans: ScanSummary[];
  historyFilter: string;
  historyQuery: string | null;
  t: Strings;
}

export interface HistoryFilters {
  filters: { key: FilterKey; label: string }[];
  visibleGroups: ScanGroup[];
  visibleCount: number;
}

/**
 * Derivation only — the filter and the query live in the app reducer, so this
 * hook owns no state and can be tested with fixed inputs and no mocks.
 */
export function useHistoryFilters(input: HistoryFiltersInput): HistoryFilters {
  const { scanGroups, allScans, historyFilter, historyQuery, t } = input;

  const filters = useMemo(() => {
    const label: Record<FilterKey, string> = {
      All: t.filterAll,
      Banana: 'Banana',
      Mango: 'Mango',
      Papaya: 'Papaya',
      Diseased: t.filterDiseased,
    };
    return FILTER_KEYS.map(key => ({
      key,
      label: `${label[key]} · ${allScans.filter(s => matchesFilter(s, key)).length}`,
    }));
  }, [allScans, t]);

  const visibleGroups: ScanGroup[] = useMemo(
    () =>
      scanGroups.map(group => ({
        label: group.label,
        scans: group.scans.filter(
          s => matchesFilter(s, historyFilter) && matchesQuery(s, historyQuery ?? ''),
        ),
      })),
    [scanGroups, historyFilter, historyQuery],
  );

  const visibleCount = visibleGroups.reduce((n, g) => n + g.scans.length, 0);

  return { filters, visibleGroups, visibleCount };
}
