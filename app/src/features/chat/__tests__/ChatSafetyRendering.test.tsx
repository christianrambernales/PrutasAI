import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ChatScreen } from '../ChatScreen';
import { LanguageProvider } from '../../../ui';
import * as preview from '../../../preview/previewContent';
import { textOf } from '../../../testing/interaction';
import type { ChatMessage, Suitability } from '../../viewModels';

const fetchedAt = Date.UTC(2026, 8, 20);

function renderChat(language: 'EN' | 'FIL', messages: ChatMessage[]): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <LanguageProvider language={language}>
        <ChatScreen
          messages={messages}
          suggestions={[]}
          curatedWording={false}
          draft=""
          onChangeDraft={() => undefined}
          onSend={() => undefined}
          onSuggestion={() => undefined}
        />
      </LanguageProvider>,
    );
  });
  return tree;
}

function suitability(): Suitability {
  return {
    ...preview.SUITABILITY,
    provisional: true,
    missingFields: ['elevation'],
    evidenceFetchedAt: fetchedAt,
    evidenceSource: 'Open-Meteo Best Match (reanalysis)',
    evidencePeriod: { fromYear: 2023, toYear: 2024 },
    evidenceCached: true,
    evidenceStatus: 'cached',
  };
}

test.each([
  ['EN', 'Provisional suitability only', 'Missing Elevation', 'Using historical data saved on 2026-09-20'],
  ['FIL', 'Pansamantala lamang ang pagiging angkop', 'Taas sa dagat', 'na-save noong 2026-09-20'],
] as const)('Chat repeats complete cached suitability warnings in %s', (language, provisional, missing, cached) => {
  const tree = renderChat(language, [{
    id: 'answer', role: 'assistant', kind: 'grounded',
    text: 'Potentially suitable', verdict: suitability(),
  }]);
  const text = textOf(tree.root);

  expect(text).toContain(provisional);
  expect(text).toContain(missing);
  expect(text).toContain(cached);
  expect(text).toContain('2023–2024');
  expect(text).toContain('Open-Meteo Best Match');
});

test.each([
  ['EN', 'outside approved local disease and remedy guidance', 'local agriculturist or agricultural extension worker'],
  ['FIL', 'Hindi ito bahagi ng aprubadong lokal na gabay', 'agricultural extension worker'],
] as const)('Each restricted answer renders its local-knowledge warning in %s', (language, policyWarning, referral) => {
  const tree = renderChat(language, [{
    id: 'restricted', role: 'assistant', kind: 'restricted',
    text: 'Visible signs can have several causes.',
  }]);
  const text = textOf(tree.root);

  expect(text).toContain(policyWarning);
  expect(text).toContain(referral);
  expect(text).toContain('Visible signs can have several causes.');
});

test.each([
  ['EN', 'The AI wording could not be checked'],
  ['FIL', 'Hindi natiyak ang pananalita ng AI'],
] as const)('A persisted rephrase notice is rendered with its curated answer in %s', (language, noticeCopy) => {
  const tree = renderChat(language, [
    { id: 'answer', role: 'assistant', kind: 'grounded', text: 'Curated answer stays authoritative.' },
    { id: 'notice', role: 'assistant', kind: 'notice', text: noticeCopy },
  ]);

  expect(tree.root.findAll(node => node.props.testID === 'rephrase-notice-answer')).not.toHaveLength(0);
  expect(textOf(tree.root)).toContain('Curated answer stays authoritative.');
  expect(textOf(tree.root)).toContain(noticeCopy);
});
