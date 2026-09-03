import { routeQuestion } from '../router';

test('questions the knowledge base answers stay grounded', () => {
  expect(routeQuestion('Can I grow bananas here?').tier).toBe('grounded');
  expect(routeQuestion('What varieties of mango are there?').tier).toBe('grounded');
  expect(routeQuestion('Are the models installed?').tier).toBe('grounded');
  expect(routeQuestion('What is the weather right now?').tier).toBe('grounded');
});

test('an open agronomy question goes to the general tier', () => {
  expect(routeQuestion('How do I control anthracnose?').tier).toBe('general');
  expect(routeQuestion('What fertiliser suits sandy soil?').tier).toBe('general');
  expect(routeQuestion('How far apart should I space banana suckers?').tier).toBe('general');
});

test('a bare greeting is general, not grounded', () => {
  expect(routeQuestion('hello').tier).toBe('general');
});

test('the questions the old build refused now reach the general tier', () => {
  // Both used to hit a hardcoded "nothing citable yet" refusal, which is the
  // failure this tier exists to end.
  expect(routeQuestion('Anthracnose remedy').tier).toBe('general');
  expect(routeQuestion('What is anthracnose?').tier).toBe('general');
});
