import { CROP_REQUIREMENTS, judgeSuitability } from '../suitability';

const NORMALS = { monthlyRainMm: Array(12).fill(200), annualRainMm: 2400, meanTemperatureC: 27, fromYear: 2021, toYear: 2025 };

function judge(over: Partial<{ annualRainMm: number; meanTemperatureC: number; elevationM: number }> = {}, fruit = 'banana') {
  return judgeSuitability({
    fruitKey: fruit,
    normals: { ...NORMALS, ...over },
    elevationM: over.elevationM ?? 30,
  });
}

test('every declared fruit carries optimal and tolerated ranges', () => {
  for (const [key, req] of Object.entries(CROP_REQUIREMENTS)) {
    for (const p of ['temperature', 'rainfall', 'elevation'] as const) {
      expect(req[p].tolerated[0]).toBeLessThanOrEqual(req[p].optimal[0]);
      expect(req[p].tolerated[1]).toBeGreaterThanOrEqual(req[p].optimal[1]);
      expect(key).toBeTruthy();
    }
  }
});

test('all three parameters inside optimal is suitable', () => {
  const v = judge();
  expect(v.verdict).toBe('suitable');
  expect(v.evidence.every(e => e.status === 'optimal')).toBe(true);
});

test('inside tolerated but outside optimal is only potentially suitable', () => {
  // Banana optimal rainfall tops out at 2,600 mm; tolerated reaches 3,500.
  const v = judge({ annualRainMm: 3000 });
  expect(v.verdict).toBe('potentially_suitable');
  expect(v.evidence.find(e => e.label.includes('rainfall'))?.status).toBe('tolerated');
});

test('any parameter outside tolerated makes it unsuitable', () => {
  const v = judge({ meanTemperatureC: 5 });
  expect(v.verdict).toBe('unsuitable');
  expect(v.evidence.find(e => e.label.includes('temperature'))?.status).toBe('outside');
});

test('one bad parameter outweighs two good ones', () => {
  const v = judge({ annualRainMm: 9000 });
  expect(v.verdict).toBe('unsuitable');
});

test('a fruit with no requirement row is insufficient data, never a guess', () => {
  const v = judgeSuitability({ fruitKey: 'durian', normals: NORMALS, elevationM: 30 });
  expect(v.verdict).toBe('insufficient_data');
  expect(v.evidence).toEqual([]);
});

test('missing normals are insufficient data rather than a negative verdict', () => {
  const v = judgeSuitability({ fruitKey: 'banana', normals: null, elevationM: 30 });
  expect(v.verdict).toBe('insufficient_data');
});

test('an unknown elevation does not by itself force a verdict', () => {
  const v = judgeSuitability({ fruitKey: 'banana', normals: NORMALS, elevationM: null });
  // Two parameters known and optimal, one unknown → not "suitable", but not bad either.
  expect(v.verdict).toBe('potentially_suitable');
  expect(v.evidence.find(e => e.label.includes('Elevation'))?.status).toBe('unknown');
});

test('the verdict reports the years the normals came from', () => {
  const v = judge();
  expect(v.basisLabel).toContain('2021');
  expect(v.basisLabel).toContain('2025');
});

test('evidence values carry units so the answer can quote them', () => {
  const v = judge();
  expect(v.evidence.find(e => e.label.includes('temperature'))?.value).toBe('27 °C');
  expect(v.evidence.find(e => e.label.includes('rainfall'))?.value).toBe('2,400 mm');
});

test('requirements are flagged unverified until an agriculturist signs them off', () => {
  expect(judge().sourceLabel.toLowerCase()).toContain('unverified');
});
