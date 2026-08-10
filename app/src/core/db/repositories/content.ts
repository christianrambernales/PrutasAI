import type { SqlDriver } from '../driver';

export interface Fruit {
  key: string; nameEn: string; nameFil: string; emoji: string | null; mlClassIndex: number;
}

export interface Variety {
  key: string; fruitKey: string; nameEn: string; nameFil: string;
  mlClassIndex: number | null; isMlClass: boolean;
  parentKey: string | null; sourceId: string | null;
}

interface FruitRow { key: string; name_en: string; name_fil: string; emoji: string | null; ml_class_index: number }
interface VarietyRow {
  key: string; fruit_key: string; name_en: string; name_fil: string;
  ml_class_index: number | null; is_ml_class: number; parent_key: string | null; source_id: string | null;
}

const toFruit = (r: FruitRow): Fruit => ({
  key: r.key, nameEn: r.name_en, nameFil: r.name_fil, emoji: r.emoji, mlClassIndex: r.ml_class_index,
});

const toVariety = (r: VarietyRow): Variety => ({
  key: r.key, fruitKey: r.fruit_key, nameEn: r.name_en, nameFil: r.name_fil,
  mlClassIndex: r.ml_class_index, isMlClass: r.is_ml_class === 1,
  parentKey: r.parent_key, sourceId: r.source_id,
});

export function listFruits(driver: SqlDriver): Fruit[] {
  return driver.all<FruitRow>('SELECT * FROM fruit ORDER BY ml_class_index').map(toFruit);
}

export function listVarieties(driver: SqlDriver, fruitKey: string): Variety[] {
  return driver
    .all<VarietyRow>('SELECT * FROM variety WHERE fruit_key = ? ORDER BY is_ml_class DESC, ml_class_index, key', [fruitKey])
    .map(toVariety);
}

export function listMlVarieties(driver: SqlDriver, fruitKey: string): Variety[] {
  return driver
    .all<VarietyRow>('SELECT * FROM variety WHERE fruit_key = ? AND is_ml_class = 1 ORDER BY ml_class_index', [fruitKey])
    .map(toVariety);
}

export function getVariety(driver: SqlDriver, key: string): Variety | undefined {
  const row = driver.get<VarietyRow>('SELECT * FROM variety WHERE key = ?', [key]);
  return row ? toVariety(row) : undefined;
}
