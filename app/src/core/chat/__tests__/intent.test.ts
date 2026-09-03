import { matchIntent } from '../intent';

test('asking whether a fruit can be grown here is a suitability question', () => {
  expect(matchIntent('Can I grow bananas here?').intent).toBe('crop_suitability');
  expect(matchIntent('Pwede bang magtanim ng saging dito sa amin?').intent).toBe(
    'crop_suitability',
  );
});

test('the fruit is extracted in either language', () => {
  expect(matchIntent('Can I grow bananas here?').slots.fruitKey).toBe('banana');
  expect(matchIntent('Pwede bang magtanim ng saging?').slots.fruitKey).toBe('banana');
  expect(matchIntent('Paano ang mangga?').slots.fruitKey).toBe('mango');
  expect(matchIntent('Tell me about papaya').slots.fruitKey).toBe('papaya');
});

test('a question with no fruit leaves the slot empty', () => {
  expect(matchIntent('What is the weather?').slots.fruitKey).toBeUndefined();
});

test('asking about varieties is a variety question', () => {
  expect(matchIntent('What varieties of mango are there?').intent).toBe('variety_info');
  expect(matchIntent('Anong mga uri ng saging?').intent).toBe('variety_info');
});

test('a named variety is extracted', () => {
  const m = matchIntent('Tell me about Lakatan');
  expect(m.intent).toBe('variety_info');
  expect(m.slots.varietyKey).toBe('lakatan');
  expect(m.slots.fruitKey).toBe('banana');
});

test('asking for a cure is a remedy question, not a disease question', () => {
  expect(matchIntent('Anthracnose remedy').intent).toBe('remedy');
  expect(matchIntent('Paano gamutin ang anthracnose?').intent).toBe('remedy');
});

test('asking what a disease is stays a disease question', () => {
  expect(matchIntent('What is anthracnose?').intent).toBe('disease_info');
});

test('asking about the weather is a climate question', () => {
  expect(matchIntent('What is the weather right now?').intent).toBe('climate_now');
  expect(matchIntent('Kumusta ang panahon ngayon?').intent).toBe('climate_now');
});

test('asking whether detection works is a model question', () => {
  expect(matchIntent('Why can I not scan anything?').intent).toBe('model_status');
  expect(matchIntent('Are the models installed?').intent).toBe('model_status');
});

test('anything unrecognised falls back rather than guessing', () => {
  expect(matchIntent('what time does the market open').intent).toBe('fallback');
  expect(matchIntent('').intent).toBe('fallback');
});

test('a bare fruit name asks about that fruit', () => {
  const m = matchIntent('mango');
  expect(m.intent).toBe('fruit_info');
  expect(m.slots.fruitKey).toBe('mango');
});

test('naming a fruit inside a wider question does not make it a fruit lookup', () => {
  // It used to answer "Banana has 4 varieties in the knowledge base", which is
  // true and useless. Falling back is what lets the general tier answer it.
  expect(matchIntent('How far apart should I space banana suckers?').intent).toBe('fallback');
});

test('a planting question is suitability even when it names a variety', () => {
  // Observed failure: this matched "saba" and answered with a variety lookup.
  const m = matchIntent('Is it good to plant banana(saba) in bacoor cavite');
  expect(m.intent).toBe('crop_suitability');
  expect(m.slots.fruitKey).toBe('banana');
});

test('Filipino planting phrasings reach suitability', () => {
  expect(matchIntent('ok ba magtanim ng mangga dito').intent).toBe('crop_suitability');
  expect(matchIntent('maganda ba ang papaya sa lugar namin').intent).toBe('crop_suitability');
  expect(matchIntent('dapat ba akong magtanim ng saging').intent).toBe('crop_suitability');
});

test('asking about a variety with no planting verb is still a variety question', () => {
  expect(matchIntent('Tell me about Lakatan').intent).toBe('variety_info');
});
