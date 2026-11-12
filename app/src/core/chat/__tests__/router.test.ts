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

test.each([
  'How do I treat anthracnose?',
  'Can I spray fungicide for mango rust?',
  'My papaya is rotting and has mold',
  'Anong gamot sa sakit ng mangga?',
  'May amag at bulok ang saging, ano ito?',
  'What pesticide dose should I use?',
  'My banana leaves have spots, what is wrong?',
  'My banana leaves look weird',
  'How do I cure anthracnos?',
])('restricted crop-health question is classified for awareness and referral: %s', question => {
  expect(routeQuestion(question).policy).toBe('restricted');
});

test('ordinary crop questions retain general policy and known local questions stay grounded', () => {
  expect(routeQuestion('How far apart should I space banana suckers?').policy).toBe('general');
  expect(routeQuestion('Can I grow bananas here?').policy).toBe('grounded');
});

test.each([
  'I see white fuzzy growth on leaves',
  'There are cottony patches on mango leaves',
  'What are these pale raised marks across the papaya fruit skin?',
])('unrecognized observed plant conditions are restricted: %s', question => {
  expect(routeQuestion(question).policy).toBe('restricted');
});
