/**
 * Severity is the lesion area divided by the fruit bounding-box area from
 * stage 1 — never by the whole image, so the result does not change with
 * camera distance. Thresholds match Thesis 1 so figures stay comparable.
 */

export type Severity = 'early' | 'moderate' | 'severe';
export type SeverityLabel = Severity | 'undetermined';

export interface Box {
  width: number;
  height: number;
}

export type SeverityResult =
  | { severity: Severity; percent: number }
  | { severity: 'undetermined'; percent: null };

const UNDETERMINED = { severity: 'undetermined', percent: null } as const;

const area = (b: Box) => b.width * b.height;

function classify(percent: number): Severity {
  if (percent < 15) return 'early';
  if (percent <= 40) return 'moderate';
  return 'severe';
}

export function assessSeverity(lesion: Box | null, fruit: Box | null): SeverityResult {
  if (lesion === null || fruit === null) return UNDETERMINED;

  const fruitArea = area(fruit);
  if (fruitArea <= 0) return UNDETERMINED;

  const raw = (area(lesion) / fruitArea) * 100;
  const percent = Math.round(Math.min(raw, 100) * 10) / 10;
  return { severity: classify(percent), percent };
}
