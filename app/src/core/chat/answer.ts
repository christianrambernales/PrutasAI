/**
 * Steps 2–4 of design spec §12: context assembly, verdict computation and
 * template rendering.
 *
 * Everything here is deterministic and offline. A language model never decides
 * a fact — at most it rewords the `text` this produces, and `facts` plus
 * `verdict` are what the online guard checks that rewording against.
 *
 * The invariant every branch must hold: **no number appears in `text` that is
 * not also in `facts`.** The guard in providers/gemini.ts enforces the same rule
 * on a reworded answer, so a template that broke it would make the guard
 * unenforceable.
 */

import type { Language, SavedLocation } from '../../state/appState';
import type {
  ClimateSnapshot,
  FruitSummary,
  Source,
  Suitability,
  VarietySummary,
} from '../../features/viewModels';
import { Intent, matchIntent } from './intent';

export interface ChatContext {
  language: Language;
  fruits: FruitSummary[];
  varietiesByFruit: Record<string, VarietySummary[]>;
  strainsByFruit: Record<string, VarietySummary[]>;
  sourcesByFruit: Record<string, Source[]>;
  climate: ClimateSnapshot | null;
  /**
   * False when a location is set but its normals have not been fetched — a
   * different failure from "this fruit has no requirement row", and the user
   * deserves to be told which.
   */
  climateReady: boolean;
  /** Null when no crop-requirement row exists for the fruit. */
  suitabilityFor: (fruitKey: string) => Suitability | null;
  location: SavedLocation | null;
  detection: { headline: string; detail: string; depth: number };
}

export interface GroundedAnswer {
  intent: Intent;
  /** Curated wording, always available with no network. */
  text: string;
  /** Every fact the answer is allowed to state. */
  facts: string[];
  /** Computed verdict for suitability questions; null for everything else. */
  verdict: string | null;
  sources: string[];
  /** The full evidence row set, so the chat can render the verdict card. */
  suitability?: Suitability | null;
}

const EN = {
  noFruit: 'Which fruit did you mean — banana, mango or papaya?',
  identifies: (n: number, fruit: string) =>
    `The model identifies ${n} ${fruit} ${n === 1 ? 'variety' : 'varieties'}:`,
  informationOnly: (names: string) =>
    `Information only, never predicted — they cannot be told apart in a photograph: ${names}.`,
  fruitSummary: (fruit: string, fil: string, n: number) =>
    `${fruit} (${fil}) has ${n} ${n === 1 ? 'variety' : 'varieties'} in the knowledge base.`,
  noLocation:
    'I need a location before I can answer that. Set one in Settings, or pick a place on the Climate screen.',
  noRequirements: (fruit: string) =>
    `I have no crop-requirement data for ${fruit} yet, so I will not guess whether it suits your area.`,
  climate: (place: string, temp: string, condition: string, freshness: string) =>
    `Right now in ${place}: ${temp}, ${condition}. ${freshness}. Today's weather is shown for context and never decides a verdict.`,
  noClimate: 'I have no climate reading for your area yet.',
  diseaseUnknown:
    'The disease knowledge base is not populated yet, so I have nothing citable to tell you about that. It arrives with the disease model.',
  remedyUnknown:
    'Remedies are not available yet. The knowledge base carries no verified treatment rows, and I will not state a dosage without a citation.',
  fallback:
    'I can answer questions about fruit varieties, whether a fruit suits your area, the current climate, and whether the detection models are installed.',
  variety: (name: string, fil: string, fruit: string, index: number | null) =>
    index === null
      ? `${name} is an information-only strain of ${fruit}; the classifier never predicts it.`
      : `${name} (${fil}) is a ${fruit} variety the model can identify.`,
  sourceLead: 'Source:',
};

const FIL = {
  noFruit: 'Aling prutas ang tinutukoy mo — saging, mangga o papaya?',
  identifies: (n: number, fruit: string) => `${n} uri ng ${fruit} ang kayang tukuyin ng modelo:`,
  informationOnly: (names: string) =>
    `Pang-impormasyon lamang, hindi kailanman hinuhulaan — hindi sila matukoy sa larawan: ${names}.`,
  fruitSummary: (fruit: string, fil: string, n: number) =>
    `Ang ${fil} (${fruit}) ay may ${n} uri sa knowledge base.`,
  noLocation:
    'Kailangan ko muna ng lokasyon bago ko masagot iyan. Magtakda sa Settings, o pumili ng lugar sa Climate.',
  noRequirements: (fruit: string) =>
    `Wala pa akong datos sa pangangailangan ng ${fruit}, kaya hindi ako manghuhula kung angkop ito sa inyong lugar.`,
  climate: (place: string, temp: string, condition: string, freshness: string) =>
    `Ngayon sa ${place}: ${temp}, ${condition}. ${freshness}. Ang panahon ngayon ay pang-konteksto lamang at hindi nagdedesisyon ng hatol.`,
  noClimate: 'Wala pa akong datos ng panahon para sa inyong lugar.',
  diseaseUnknown:
    'Hindi pa punô ang knowledge base ng sakit, kaya wala akong mabanggit na may sanggunian. Darating ito kasama ng disease model.',
  remedyUnknown:
    'Wala pang lunas na maibibigay. Walang na-verify na paggamot sa knowledge base, at hindi ako magsasabi ng dosis nang walang sanggunian.',
  fallback:
    'Masasagot ko ang tungkol sa uri ng prutas, kung angkop ang isang prutas sa inyong lugar, ang kasalukuyang panahon, at kung nakaluklok ba ang mga detection model.',
  variety: (name: string, fil: string, fruit: string, index: number | null) =>
    index === null
      ? `Ang ${name} ay strain ng ${fruit} na pang-impormasyon lamang; hindi ito hinuhulaan ng classifier.`
      : `Ang ${name} (${fil}) ay uri ng ${fruit} na kayang tukuyin ng modelo.`,
  sourceLead: 'Sanggunian:',
};

function strings(language: Language) {
  return language === 'FIL' ? FIL : EN;
}

function fruitName(ctx: ChatContext, key: string): string {
  const fruit = ctx.fruits.find(f => f.key === key);
  if (!fruit) return key;
  return ctx.language === 'FIL' ? fruit.nameFil : fruit.nameEn;
}

function sourcesFor(ctx: ChatContext, fruitKey?: string): string[] {
  if (!fruitKey) return [];
  return (ctx.sourcesByFruit[fruitKey] ?? []).map(s => s.citation);
}

function withSources(text: string, sources: string[], language: Language): string {
  if (sources.length === 0) return text;
  return `${text}\n\n${strings(language).sourceLead} ${sources.join(', ')}`;
}

export function answerQuestion(question: string, ctx: ChatContext): GroundedAnswer {
  const { intent, slots } = matchIntent(question);
  const s = strings(ctx.language);
  const sources = sourcesFor(ctx, slots.fruitKey);

  switch (intent) {
    case 'variety_info': {
      if (!slots.fruitKey) {
        return { intent, text: s.noFruit, facts: [], verdict: null, sources: [] };
      }
      const name = fruitName(ctx, slots.fruitKey);
      const varieties = ctx.varietiesByFruit[slots.fruitKey] ?? [];
      const strains = ctx.strainsByFruit[slots.fruitKey] ?? [];

      // A specific variety was named: answer about that one.
      if (slots.varietyKey) {
        const all = [...varieties, ...strains];
        const v = all.find(x => x.key === slots.varietyKey);
        if (v) {
          const text = s.variety(v.nameEn, v.nameFil, name, v.mlClassIndex);
          return {
            intent,
            text: withSources(text, sources, ctx.language),
            facts: [v.nameEn, v.nameFil, name, v.parentName ?? '', String(v.mlClassIndex ?? '')],
            verdict: null,
            sources,
          };
        }
      }

      const lines = [s.identifies(varieties.length, name), ...varieties.map(v => `• ${v.nameEn}`)];
      if (strains.length > 0) {
        lines.push('', s.informationOnly(strains.map(v => v.nameEn).join(', ')));
      }
      return {
        intent,
        text: withSources(lines.join('\n'), sources, ctx.language),
        facts: [
          String(varieties.length),
          String(strains.length),
          name,
          ...varieties.map(v => v.nameEn),
          ...strains.map(v => v.nameEn),
        ],
        verdict: null,
        sources,
      };
    }

    case 'fruit_info': {
      if (!slots.fruitKey) {
        return { intent, text: s.noFruit, facts: [], verdict: null, sources: [] };
      }
      const fruit = ctx.fruits.find(f => f.key === slots.fruitKey);
      const varieties = ctx.varietiesByFruit[slots.fruitKey] ?? [];
      const text = s.fruitSummary(
        fruit?.nameEn ?? slots.fruitKey,
        fruit?.nameFil ?? '',
        varieties.length,
      );
      return {
        intent,
        text: withSources(text, sources, ctx.language),
        facts: [fruit?.nameEn ?? '', fruit?.nameFil ?? '', String(varieties.length)],
        verdict: null,
        sources,
      };
    }

    case 'crop_suitability': {
      if (!slots.fruitKey) {
        return { intent, text: s.noFruit, facts: [], verdict: null, sources: [] };
      }
      // Location first: without one there is nothing to compare against, which
      // the spec scores as insufficient_data rather than a negative verdict.
      if (!ctx.location) {
        return { intent, text: s.noLocation, facts: [], verdict: 'insufficient_data', sources: [] };
      }
      if (!ctx.climateReady) {
        return { intent, text: s.noClimate, facts: [], verdict: 'insufficient_data', sources: [] };
      }
      const suitability = ctx.suitabilityFor(slots.fruitKey);
      if (!suitability) {
        return {
          intent,
          text: s.noRequirements(fruitName(ctx, slots.fruitKey)),
          facts: [fruitName(ctx, slots.fruitKey)],
          verdict: 'insufficient_data',
          sources,
        };
      }

      const evidenceLines = suitability.evidence.map(
        e => `• ${e.label}: ${e.value} (${e.rangeLabel}) — ${e.status}`,
      );
      const text = [
        `${suitability.headline} — ${suitability.fruitName}, ${ctx.location.label}.`,
        suitability.detail,
        '',
        ...evidenceLines,
        '',
        suitability.basisLabel,
      ].join('\n');

      return {
        intent,
        text,
        facts: [
          suitability.headline,
          suitability.detail,
          suitability.fruitName,
          ctx.location.label,
          suitability.basisLabel,
          suitability.sourceLabel,
          ...suitability.evidence.flatMap(e => [e.label, e.value, e.rangeLabel, e.status]),
        ],
        verdict: suitability.verdict,
        sources: [...sources, suitability.sourceLabel],
        suitability,
      };
    }

    case 'climate_now': {
      if (!ctx.climate) {
        return { intent, text: s.noClimate, facts: [], verdict: null, sources: [] };
      }
      const c = ctx.climate;
      const text = s.climate(c.place, `${c.temperatureC}°C`, c.condition, c.freshnessLabel);
      return {
        intent,
        text,
        facts: [
          c.place,
          `${c.temperatureC}°C`,
          String(c.temperatureC),
          c.condition,
          c.freshnessLabel,
          c.coordsLabel,
        ],
        verdict: null,
        sources: [],
      };
    }

    case 'disease_info':
      return { intent, text: s.diseaseUnknown, facts: [], verdict: null, sources: [] };

    case 'remedy':
      return { intent, text: s.remedyUnknown, facts: [], verdict: null, sources: [] };

    case 'model_status':
      return {
        intent,
        text: `${ctx.detection.headline}. ${ctx.detection.detail}`,
        facts: [ctx.detection.headline, ctx.detection.detail],
        verdict: null,
        sources: [],
      };

    case 'fallback':
      return { intent, text: s.fallback, facts: [], verdict: null, sources: [] };
  }
}
