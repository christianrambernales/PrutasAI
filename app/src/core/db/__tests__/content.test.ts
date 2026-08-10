import { readFileSync } from 'fs';
import { join } from 'path';
import { createTestDriver } from '../testing/betterSqliteDriver';
import { migrate } from '../migrate';
import { seedContent } from '../seed';
import { listFruits, listVarieties, listMlVarieties, getVariety } from '../repositories/content';

function seeded() {
  const db = createTestDriver();
  migrate(db);
  const sql = readFileSync(join(__dirname, '../seed.sql'), 'utf8');
  seedContent(db, sql, 'test');
  return db;
}

test('lists exactly the three supported fruits in class order', () => {
  const fruits = listFruits(seeded());
  expect(fruits.map(f => f.key)).toEqual(['banana', 'mango', 'papaya']);
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
