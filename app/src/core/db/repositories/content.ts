import type { SqlDriver } from '../driver';
import type { FruitSummary, Source, VarietySummary } from '../../../features/viewModels';

export interface Fruit extends FruitSummary {
  mlClassIndex: number;
}

export interface Variety {
  key: string;
  fruitKey: string;
  nameEn: string;
  nameFil: string;
  mlClassIndex: number | null;
  isMlClass: boolean;
  parentKey: string | null;
  sourceId: string | null;
}

interface FruitRow {
  key: string;
  name_en: string;
  name_fil: string;
  emoji: string | null;
  ml_class_index: number;
  variety_count: number;
}

interface VarietyRow {
  key: string;
  fruit_key: string;
  name_en: string;
  name_fil: string;
  ml_class_index: number | null;
  is_ml_class: number;
  parent_key: string | null;
  parent_name?: string | null;
  source_id: string | null;
}

interface SourceRow {
  fruit_key: string;
  id: string;
  citation: string;
  url: string | null;
  retrieved_at: string | null;
}

const toFruit = (r: FruitRow): Fruit => ({
  key: r.key,
  nameEn: r.name_en,
  nameFil: r.name_fil,
  emoji: r.emoji ?? '',
  mlClassIndex: r.ml_class_index,
  varietyCount: r.variety_count ?? 0,
});

const toVariety = (r: VarietyRow): Variety => ({
  key: r.key,
  fruitKey: r.fruit_key,
  nameEn: r.name_en,
  nameFil: r.name_fil,
  mlClassIndex: r.ml_class_index,
  isMlClass: r.is_ml_class === 1,
  parentKey: r.parent_key,
  sourceId: r.source_id,
});

export function listFruits(driver: SqlDriver): Fruit[] {
  return driver
    .all<FruitRow>(
      `SELECT
         f.key,
         f.name_en,
         f.name_fil,
         f.emoji,
         f.ml_class_index,
         (SELECT COUNT(*) FROM variety v WHERE v.fruit_key = f.key AND v.is_ml_class = 1) AS variety_count
       FROM fruit f
       ORDER BY f.ml_class_index`,
    )
    .map(toFruit);
}

export function listVarieties(driver: SqlDriver, fruitKey: string): Variety[] {
  return driver
    .all<VarietyRow>(
      'SELECT * FROM variety WHERE fruit_key = ? ORDER BY is_ml_class DESC, ml_class_index, key',
      [fruitKey],
    )
    .map(toVariety);
}

export function listMlVarieties(driver: SqlDriver, fruitKey: string): Variety[] {
  return driver
    .all<VarietyRow>(
      'SELECT * FROM variety WHERE fruit_key = ? AND is_ml_class = 1 ORDER BY ml_class_index',
      [fruitKey],
    )
    .map(toVariety);
}

export function getVariety(driver: SqlDriver, key: string): Variety | undefined {
  const row = driver.get<VarietyRow>('SELECT * FROM variety WHERE key = ?', [key]);
  return row ? toVariety(row) : undefined;
}

export function listAllVarietiesByFruit(driver: SqlDriver): {
  varieties: Record<string, VarietySummary[]>;
  strains: Record<string, VarietySummary[]>;
} {
  const fruits = listFruits(driver);
  const varieties: Record<string, VarietySummary[]> = {};
  const strains: Record<string, VarietySummary[]> = {};

  for (const fruit of fruits) {
    varieties[fruit.key] = [];
    strains[fruit.key] = [];
  }

  const rows = driver.all<VarietyRow>(
    `SELECT
       v.key,
       v.fruit_key,
       v.name_en,
       v.name_fil,
       v.ml_class_index,
       v.is_ml_class,
       v.parent_key,
       parent.name_en AS parent_name,
       v.source_id
     FROM variety v
     LEFT JOIN variety parent ON v.parent_key = parent.key
     ORDER BY v.is_ml_class DESC, v.ml_class_index, v.key`,
  );

  for (const r of rows) {
    if (!varieties[r.fruit_key]) varieties[r.fruit_key] = [];
    if (!strains[r.fruit_key]) strains[r.fruit_key] = [];

    if (r.is_ml_class === 1) {
      varieties[r.fruit_key].push({
        key: r.key,
        nameEn: r.name_en,
        nameFil: r.name_fil,
        mlClassIndex: r.ml_class_index,
      });
    } else {
      strains[r.fruit_key].push({
        key: r.key,
        nameEn: r.name_en,
        nameFil: r.name_fil,
        mlClassIndex: null,
        parentName: r.parent_name ?? undefined,
      });
    }
  }

  return { varieties, strains };
}

function parseSourceCitation(citation: string): { citation: string; detail: string } {
  const dotIdx = citation.indexOf('. ');
  if (dotIdx !== -1) {
    return {
      citation: citation.slice(0, dotIdx).trim(),
      detail: citation.slice(dotIdx + 2).replace(/\.$/, '').trim(),
    };
  }
  return { citation: citation.trim(), detail: '' };
}

export function listSourcesByFruit(driver: SqlDriver): Record<string, Source[]> {
  const fruits = listFruits(driver);
  const sourcesByFruit: Record<string, Source[]> = {};

  for (const fruit of fruits) {
    sourcesByFruit[fruit.key] = [];
  }

  const rows = driver.all<SourceRow>(
    `SELECT
       v.fruit_key,
       s.id,
       s.citation,
       s.url,
       s.retrieved_at,
       MIN(CASE WHEN v.is_ml_class = 1 THEN v.ml_class_index ELSE 100 END) as sort_order
     FROM variety v
     JOIN source s ON v.source_id = s.id
     GROUP BY v.fruit_key, s.id, s.citation, s.url, s.retrieved_at
     ORDER BY v.fruit_key, sort_order, s.id`,
  );

  for (const r of rows) {
    if (!sourcesByFruit[r.fruit_key]) {
      sourcesByFruit[r.fruit_key] = [];
    }
    const { citation, detail } = parseSourceCitation(r.citation);
    sourcesByFruit[r.fruit_key].push({
      citation,
      detail,
      retrievedLabel: r.retrieved_at ? `retrieved ${r.retrieved_at}` : '',
    });
  }

  return sourcesByFruit;
}
