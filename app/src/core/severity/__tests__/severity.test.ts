import { assessSeverity } from '../index';

const box = (width: number, height: number) => ({ width, height });

test('reports early below 15 percent of the fruit area', () => {
  // 10 x 10 lesion inside a 100 x 100 fruit = 1%
  expect(assessSeverity(box(10, 10), box(100, 100))).toEqual({
    severity: 'early',
    percent: 1,
  });
});

test('reports moderate at exactly 15 percent', () => {
  expect(assessSeverity(box(15, 100), box(100, 100)).severity).toBe('moderate');
});

test('reports moderate at exactly 40 percent', () => {
  expect(assessSeverity(box(40, 100), box(100, 100)).severity).toBe('moderate');
});

test('reports severe above 40 percent', () => {
  expect(assessSeverity(box(41, 100), box(100, 100)).severity).toBe('severe');
});

test('reports undetermined when stage 1 produced no fruit box', () => {
  expect(assessSeverity(box(10, 10), null)).toEqual({
    severity: 'undetermined',
    percent: null,
  });
});

test('reports undetermined when there is no lesion box', () => {
  expect(assessSeverity(null, box(100, 100)).severity).toBe('undetermined');
});

test('reports undetermined rather than dividing by a zero-area fruit box', () => {
  expect(assessSeverity(box(10, 10), box(0, 100)).severity).toBe('undetermined');
});

test('is scale invariant: the same fruit shot twice as close scores the same', () => {
  const far = assessSeverity(box(20, 20), box(100, 100));
  const near = assessSeverity(box(40, 40), box(200, 200));
  expect(near).toEqual(far);
});

test('clamps a lesion larger than the fruit box to 100 percent', () => {
  expect(assessSeverity(box(200, 200), box(100, 100))).toEqual({
    severity: 'severe',
    percent: 100,
  });
});
