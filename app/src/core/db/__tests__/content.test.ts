import { readFileSync } from 'fs';
import { join } from 'path';
import { createTestDriver } from '../testing/betterSqliteDriver';
import { migrate } from '../migrate';
import { seedContent } from '../seed';
import {
  listFruits,
  listVarieties,
  listMlVarieties,
  getVariety,
  listAllVarietiesByFruit,
  listSourcesByFruit,
} from '../repositories/content';

function seeded() {
  const db = createTestDriver();
  migrate(db);
  const sql = readFileSync(join(__dirname, '../seed.sql'), 'utf8');
  seedContent(db, sql, 'test');
  return db;
}

test('lists exactly the three supported fruits in class order with varietyCount', () => {
  const fruits = listFruits(seeded());
  expect(fruits.map(f => f.key)).toEqual(['banana', 'mango', 'papaya']);
  expect(fruits[0]).toMatchObject({
    key: 'banana',
    nameEn: 'Banana',
    nameFil: 'Saging',
    emoji: '🍌',
    varietyCount: 4,
  });
  expect(fruits[1]).toMatchObject({
    key: 'mango',
    nameEn: 'Mango',
    nameFil: 'Mangga',
    emoji: '🥭',
    varietyCount: 3,
  });
  expect(fruits[2]).toMatchObject({
    key: 'papaya',
    nameEn: 'Papaya',
    nameFil: 'Papaya',
    varietyCount: 4,
  });
});

test('never exposes orange or capsicum', () => {
  const keys = listFruits(seeded()).map(f => f.key);
  expect(keys).not.toContain('orange');
  expect(keys).not.toContain('capsicum');
});

test('lists all mango varieties including clonal strains', () => {
  const keys = listVarieties(seeded(), 'mango').map(v => v.key);
  expect(keys).toContain('carabao');
  expect(keys).toContain('mmsu_gold');
});

test('lists only ml classes for the classifier, in index order', () => {
  const keys = listMlVarieties(seeded(), 'mango').map(v => v.key);
  expect(keys).toEqual(['carabao', 'pico', 'katchamita']);
});

test('exposes a strain parent so the UI can explain the relationship', () => {
  const gold = getVariety(seeded(), 'mmsu_gold');
  expect(gold?.parentKey).toBe('carabao');
  expect(gold?.isMlClass).toBe(false);
});

test('returns undefined for an unknown variety rather than throwing', () => {
  expect(getVariety(seeded(), 'nope')).toBeUndefined();
});

test('listAllVarietiesByFruit groups ML classes and strains with parent names', () => {
  const { varieties, strains } = listAllVarietiesByFruit(seeded());

  // Banana has 4 ML classes, 0 strains
  expect(varieties.banana).toHaveLength(4);
  expect(strains.banana).toHaveLength(0);
  expect(varieties.banana.map(v => v.key)).toEqual(['lakatan', 'latundan', 'saba', 'cavendish']);
  expect(varieties.banana.map(v => v.mlClassIndex)).toEqual([0, 1, 2, 3]);

  // Mango has 3 ML classes, 2 strains with parentName 'Carabao'
  expect(varieties.mango).toHaveLength(3);
  expect(strains.mango).toHaveLength(2);
  expect(varieties.mango.map(v => v.key)).toEqual(['carabao', 'pico', 'katchamita']);
  expect(strains.mango[0]).toMatchObject({
    key: 'mmsu_gold',
    nameEn: 'MMSU Gold',
    parentName: 'Carabao',
    mlClassIndex: null,
  });
  expect(strains.mango[1]).toMatchObject({
    key: 'sweet_elena',
    nameEn: 'Sweet Elena',
    parentName: 'Carabao',
    mlClassIndex: null,
  });

  // Papaya has 4 ML classes, 0 strains
  expect(varieties.papaya).toHaveLength(4);
  expect(strains.papaya).toHaveLength(0);
  expect(varieties.papaya.map(v => v.key)).toEqual(['solo', 'cavite_special', 'red_lady', 'sinta']);
});

test('listSourcesByFruit returns structured sources per fruit', () => {
  const sources = listSourcesByFruit(seeded());

  expect(sources.banana).toHaveLength(1);
  expect(sources.banana[0]).toMatchObject({
    citation: 'PCAARRD-DOST',
    detail: 'Improved Lakatan and Cavendish varieties through S&T',
    retrievedLabel: 'retrieved 2026-08-10',
  });

  expect(sources.mango).toHaveLength(2);
  expect(sources.mango[0]).toMatchObject({
    citation: 'PCAARRD-DOST',
    detail: 'Mango — Industry Strategic Science and Technology Plans',
    retrievedLabel: 'retrieved 2026-08-10',
  });
  expect(sources.mango[1]).toMatchObject({
    citation: 'Department of Agriculture',
    detail: '9 new varieties that will strengthen the Philippine mango industry',
    retrievedLabel: 'retrieved 2026-08-10',
  });

  expect(sources.papaya).toHaveLength(1);
  expect(sources.papaya[0]).toMatchObject({
    citation: 'UPLB Institute of Plant Breeding',
    detail: 'Sinta papaya, the super breed',
    retrievedLabel: 'retrieved 2026-08-10',
  });
});

