/**
 * Verdict computation — design spec §12 step 3.
 *
 * A pure function, no model involved. The three compared parameters come from
 * the multi-year **normals** and the site elevation, never from today's
 * observation: a hot afternoon must not make a place unsuitable for banana.
 *
 * Ranking, in order:
 *   - `insufficient_data` — no normals, or no crop-requirement row
 *   - `unsuitable`        — any *known* parameter outside its tolerated range
 *   - `suitable`          — every parameter known and inside its optimal range
 *   - `potentially_suitable` — otherwise
 *
 * An unknown parameter never forces a verdict on its own; it only prevents
 * `suitable`, because we cannot claim a full match on partial evidence.
 */

import type { EvidenceStatus } from '../../ui';
import type { ClimateNormalsData } from './openMeteo';

export type Verdict = 'suitable' | 'potentially_suitable' | 'unsuitable' | 'insufficient_data';

type Range = [number, number];

export interface ParameterRequirement {
  optimal: Range;
  tolerated: Range;
}

export interface CropRequirement {
  temperature: ParameterRequirement;
  rainfall: ParameterRequirement;
  elevation: ParameterRequirement;
  citation: string;
}

/**
 * Indicative ranges for the three fruits in the knowledge base.
 *
 * These are **unverified** — every surface that shows them says so, and the
 * `sourceLabel` below carries the caveat. They move into
 * knowledge/crop-requirements.yaml with a citation once the project
 * agriculturist signs them off; until then the app states a verdict but never
 * claims the ranges are authoritative.
 */
export const CROP_REQUIREMENTS: Record<string, CropRequirement> = {
  banana: {
    temperature: { optimal: [26, 30], tolerated: [20, 35] },
    rainfall: { optimal: [1800, 2600], tolerated: [1200, 3500] },
    elevation: { optimal: [0, 600], tolerated: [0, 1000] },
    citation: 'PCAARRD-DOST — Banana',
  },
  mango: {
    temperature: { optimal: [24, 30], tolerated: [20, 35] },
    rainfall: { optimal: [750, 1500], tolerated: [500, 2500] },
    elevation: { optimal: [0, 600], tolerated: [0, 1000] },
    citation: 'PCAARRD-DOST — Mango ISP',
  },
  papaya: {
    temperature: { optimal: [25, 30], tolerated: [21, 33] },
    rainfall: { optimal: [1200, 2000], tolerated: [1000, 2500] },
    elevation: { optimal: [0, 300], tolerated: [0, 600] },
    citation: 'UPLB Institute of Plant Breeding',
  },
};

export interface EvidenceRow {
  label: string;
  value: string;
  rangeLabel: string;
  status: EvidenceStatus;
  icon: 'thermometer' | 'cloudRain' | 'mountain';
}

export interface SuitabilityVerdict {
  verdict: Verdict;
  headline: string;
  detail: string;
  evidence: EvidenceRow[];
  basisLabel: string;
  sourceLabel: string;
}

const HEADLINE: Record<Verdict, string> = {
  suitable: 'Suitable',
  potentially_suitable: 'Potentially suitable',
  unsuitable: 'Unsuitable',
  insufficient_data: 'Not enough data',
};

function classify(value: number | null, req: ParameterRequirement): EvidenceStatus {
  if (value === null || !Number.isFinite(value)) return 'unknown';
  if (value < req.tolerated[0] || value > req.tolerated[1]) return 'outside';
  if (value < req.optimal[0] || value > req.optimal[1]) return 'tolerated';
  return 'optimal';
}

function number(value: number): string {
  return value.toLocaleString('en-US');
}

export interface JudgeInput {
  fruitKey: string;
  normals: ClimateNormalsData | null;
  elevationM: number | null;
}

export function judgeSuitability({ fruitKey, normals, elevationM }: JudgeInput): SuitabilityVerdict {
  const req = CROP_REQUIREMENTS[fruitKey];

  if (!req || !normals) {
    return {
      verdict: 'insufficient_data',
      headline: HEADLINE.insufficient_data,
      detail: !req
        ? 'No crop-requirement data exists for this fruit yet, so no verdict is given.'
        : 'No climate normals for this location yet, so no verdict is given.',
      evidence: [],
      basisLabel: '',
      sourceLabel: '',
    };
  }

  const evidence: EvidenceRow[] = [
    {
      label: 'Mean temperature',
      value: `${normals.meanTemperatureC} °C`,
      rangeLabel: `optimal ${req.temperature.optimal[0]}–${req.temperature.optimal[1]} °C`,
      status: classify(normals.meanTemperatureC, req.temperature),
      icon: 'thermometer',
    },
    {
      label: 'Annual rainfall',
      value: `${number(normals.annualRainMm)} mm`,
      rangeLabel: `optimal ${number(req.rainfall.optimal[0])}–${number(req.rainfall.optimal[1])} mm`,
      status: classify(normals.annualRainMm, req.rainfall),
      icon: 'cloudRain',
    },
    {
      label: 'Elevation',
      value: elevationM === null ? 'unknown' : `${number(elevationM)} m`,
      rangeLabel: `optimal below ${number(req.elevation.optimal[1])} m`,
      status: classify(elevationM, req.elevation),
      icon: 'mountain',
    },
  ];

  const statuses = evidence.map(e => e.status);
  const verdict: Verdict = statuses.includes('outside')
    ? 'unsuitable'
    : statuses.every(s => s === 'optimal')
      ? 'suitable'
      : 'potentially_suitable';

  const outside = evidence.filter(e => e.status === 'outside').map(e => e.label.toLowerCase());
  const tolerated = evidence.filter(e => e.status === 'tolerated').map(e => e.label.toLowerCase());
  const unknown = evidence.filter(e => e.status === 'unknown').map(e => e.label.toLowerCase());

  const detail =
    verdict === 'unsuitable'
      ? `Outside the tolerated range on ${outside.join(' and ')}.`
      : verdict === 'suitable'
        ? 'Every compared parameter sits inside its optimal range.'
        : [
            tolerated.length > 0 ? `Inside tolerated but outside optimal on ${tolerated.join(' and ')}.` : '',
            unknown.length > 0 ? `No data for ${unknown.join(' and ')}.` : '',
          ]
            .filter(Boolean)
            .join(' ');

  return {
    verdict,
    headline: HEADLINE[verdict],
    detail,
    evidence,
    basisLabel: `Computed from ${normals.toYear - normals.fromYear + 1}-year normals, ${normals.fromYear}–${normals.toYear} — not from today's weather.`,
    sourceLabel: `Ranges unverified · ${req.citation} · Climate: Open-Meteo (CC BY 4.0)`,
  };
}
