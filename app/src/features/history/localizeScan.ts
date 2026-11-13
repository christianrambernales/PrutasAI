import type { Language } from '../../ui/i18n/strings';
import type { strings } from '../../ui/i18n/strings';
import type { ScanGroup, ScanSummary } from '../viewModels';

type Copy = ReturnType<typeof strings>;

/** Localize display fields from saved facts, without changing scan identity or status. */
export function localizeStoredScan<T extends ScanSummary>(
  scan: T,
  language: Language,
  t: Copy,
): T {
  // Preview/test rows have no raw names. Keep their provided display text.
  if (scan.fruitNameEn === undefined && scan.fruitNameFil === undefined) return scan;

  const fruit = language === 'FIL' ? scan.fruitNameFil || scan.fruitNameEn : scan.fruitNameEn;
  const variety = language === 'FIL' ? scan.varietyNameFil || scan.varietyNameEn : scan.varietyNameEn;
  const title = fruit ? [fruit, variety].filter(Boolean).join(' · ') : t.scanUnidentified;
  const detail = fruit ? t.scanNoDiseaseModel : t.scanNotIdentifiedNoModel;
  let timeLabel = scan.timeLabel;
  if (scan.createdAtIso) {
    const date = new Date(scan.createdAtIso);
    if (Number.isFinite(date.getTime())) {
      const today = new Date();
      timeLabel = date.toDateString() === today.toDateString()
        ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        : date.toLocaleDateString(language === 'FIL' ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric' });
    }
  }
  return { ...scan, title, detail, timeLabel };
}

export function localizeScanGroups(
  groups: ScanGroup[],
  language: Language,
  t: Copy,
): ScanGroup[] {
  const labels: Record<string, string> = {
    TODAY: t.historyGroupToday,
    'THIS WEEK': t.historyGroupThisWeek,
    EARLIER: t.historyGroupEarlier,
  };
  return groups.map(group => ({
    label: labels[group.label] ?? group.label,
    scans: group.scans.map(scan => localizeStoredScan(scan, language, t)),
  }));
}
