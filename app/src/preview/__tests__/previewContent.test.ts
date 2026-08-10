import {
  FRUITS,
  SOURCES_BY_FRUIT,
  STRAINS_BY_FRUIT,
  VARIETIES_BY_FRUIT,
} from '../previewContent';

/**
 * The variety-info screen looks these maps up by fruit key and falls back to an
 * empty list, so a missing entry would render a silently blank screen rather
 * than failing. These guard that every fruit is covered and stays in step with
 * knowledge/taxonomy.yaml.
 */

test('every fruit has a variety list', () => {
  for (const fruit of FRUITS) {
    expect(VARIETIES_BY_FRUIT[fruit.key]).toBeDefined();
    expect(VARIETIES_BY_FRUIT[fruit.key].length).toBeGreaterThan(0);
  }
});

test('the variety count advertised on the home card matches the list', () => {
  for (const fruit of FRUITS) {
    expect(VARIETIES_BY_FRUIT[fruit.key]).toHaveLength(fruit.varietyCount);
  }
});

test('every fruit has a strain list, even when empty', () => {
  for (const fruit of FRUITS) {
    expect(STRAINS_BY_FRUIT[fruit.key]).toBeDefined();
  }
});

test('every fruit cites at least one source', () => {
  for (const fruit of FRUITS) {
    expect(SOURCES_BY_FRUIT[fruit.key]?.length ?? 0).toBeGreaterThan(0);
  }
});

test('model varieties carry a class index and strains never do', () => {
  for (const fruit of FRUITS) {
    for (const v of VARIETIES_BY_FRUIT[fruit.key]) {
      expect(typeof v.mlClassIndex).toBe('number');
    }
    for (const s of STRAINS_BY_FRUIT[fruit.key]) {
      expect(s.mlClassIndex).toBeNull();
      expect(s.parentName).toBeTruthy();
    }
  }
});

test('class indices are scoped per fruit, starting at zero', () => {
  for (const fruit of FRUITS) {
    const indices = VARIETIES_BY_FRUIT[fruit.key].map(v => v.mlClassIndex);
    expect(indices).toEqual([...indices].sort((a, b) => (a ?? 0) - (b ?? 0)));
    expect(indices[0]).toBe(0);
  }
});
