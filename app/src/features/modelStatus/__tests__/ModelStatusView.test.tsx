import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import type { ModelRegistry } from '../../../core/ml/registry';
import type { ModelRoleId, SupportedFruit } from '../../../core/ml/manifest';
import type { ModelRow } from '../../viewModels';
import { LanguageProvider, strings, type Language } from '../../../ui';
import { ModelStatusView } from '../ModelStatusView';
import { RouteBody } from '../../../navigation/render/routes';
import { makeShell } from '../../../testing/shellFixture';
import { press } from '../../../testing/interaction';

type StatusFixture = 'empty' | 'banana-partial' | 'invalid' | 'full';

const ROLES: Record<SupportedFruit, ModelRoleId[]> = {
  banana: ['fruit_detector', 'variety_banana', 'disease_detector'],
  mango: ['fruit_detector', 'variety_mango', 'disease_detector'],
  papaya: ['fruit_detector', 'variety_papaya', 'disease_detector'],
};

function modelRow(id: ModelRoleId, fruits: SupportedFruit[], state: ModelRow['state'] = 'ready'): ModelRow {
  const stage = id.startsWith('fruit_') ? 1 : id.startsWith('variety_') ? 2 : 3;
  return {
    id,
    stage,
    fruits,
    state,
    source: state === 'ready' ? 'bundled' : null,
    version: 'synthetic',
    verified: state === 'ready',
  };
}

function fixture(kind: StatusFixture): { models: ModelRow[]; fruits: ModelRegistry['fruits'] } {
  if (kind === 'empty') {
    return {
      models: [],
      fruits: {
        banana: { validatedRoles: [], prerequisiteValidatedRoles: [] },
        mango: { validatedRoles: [], prerequisiteValidatedRoles: [] },
        papaya: { validatedRoles: [], prerequisiteValidatedRoles: [] },
      },
    };
  }

  if (kind === 'banana-partial') {
    const validatedRoles: ModelRoleId[] = ['fruit_detector', 'variety_banana'];
    return {
      models: [modelRow('fruit_detector', ['banana']), modelRow('variety_banana', ['banana'])],
      fruits: {
        banana: { validatedRoles, prerequisiteValidatedRoles: validatedRoles },
        mango: { validatedRoles: [], prerequisiteValidatedRoles: [] },
        papaya: { validatedRoles: [], prerequisiteValidatedRoles: [] },
      },
    };
  }

  if (kind === 'invalid') {
    return {
      models: [modelRow('fruit_detector', ['banana'], 'checksum_mismatch')],
      fruits: {
        banana: { validatedRoles: [], prerequisiteValidatedRoles: [] },
        mango: { validatedRoles: [], prerequisiteValidatedRoles: [] },
        papaya: { validatedRoles: [], prerequisiteValidatedRoles: [] },
      },
    };
  }

  const models = [
    modelRow('fruit_detector', ['banana', 'mango', 'papaya']),
    modelRow('variety_banana', ['banana']),
    modelRow('variety_mango', ['mango']),
    modelRow('variety_papaya', ['papaya']),
    modelRow('disease_detector', ['banana', 'mango', 'papaya']),
  ];
  return {
    models,
    fruits: {
      banana: { validatedRoles: ROLES.banana, prerequisiteValidatedRoles: ROLES.banana },
      mango: { validatedRoles: ROLES.mango, prerequisiteValidatedRoles: ROLES.mango },
      papaya: { validatedRoles: ROLES.papaya, prerequisiteValidatedRoles: ROLES.papaya },
    },
  };
}

function renderStatus(kind: StatusFixture, language: Language): ReactTestRenderer {
  const t = strings(language);
  const data = fixture(kind);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ModelStatusView
        headline={kind === 'empty' ? t.modelStatusEmptyHeadline : t.modelStatusValidatedHeadline}
        models={data.models}
        fruits={data.fruits}
        manifestVersion={1}
        language={language}
        t={t}
      />,
    );
  });
  return tree;
}

function renderedText(tree: ReactTestRenderer): string {
  const collect = (node: unknown): string => {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(collect).join(' ');
    if (typeof node === 'object' && 'children' in node) {
      return collect((node as { children?: unknown }).children);
    }
    return '';
  };
  return collect(tree.toJSON());
}

describe.each<Language>(['EN', 'FIL'])('ModelStatusView (%s)', language => {
  const t = strings(language);

  test.each<StatusFixture>(['empty', 'banana-partial', 'invalid', 'full'])(
    'renders %s status matching prototype v2 without legacy sections or diagnostic claims', kind => {
      const content = renderedText(renderStatus(kind, language));

      expect(content).toContain(language === 'FIL' ? 'Katayuan ng AI Model' : 'AI Model Registry');
      expect(content).toContain(language === 'FIL' ? 'Yugto ng Thesis Prototype' : 'Thesis Phase Disclosure');
      expect(content).toContain('Stage 1: Fruit Detector (YOLO)');
      expect(content).toContain('Stage 2: Variety Classifier');
      expect(content).toContain('Stage 3: Disease & Lesion Segmentation');

      expect(content).not.toContain(t.howToImportModels);
      expect(content).not.toContain(t.modelInferenceUnverified);
      expect(content).not.toContain(t.noModelsDeclared);
      expect(content).not.toMatch(/diagnos(?:is|tic)/i);

      const readyLabel = language === 'FIL' ? 'Handa' : 'Ready';
      const noWeightsLabel = language === 'FIL' ? 'Walang Weights' : 'No Weights';

      if (kind === 'empty' || kind === 'invalid') {
        expect(content.match(new RegExp(noWeightsLabel, 'g'))).toHaveLength(3);
      } else if (kind === 'banana-partial') {
        expect(content.match(new RegExp(readyLabel, 'g'))).toHaveLength(2);
        expect(content.match(new RegExp(noWeightsLabel, 'g'))).toHaveLength(1);
      } else {
        expect(content.match(new RegExp(readyLabel, 'g'))).toHaveLength(3);
      }
    },
  );
});

describe('ModelStatusScreen via RouteBody', () => {
  test('invokes shell.nav.back when Back or Back to Account & Settings is pressed and omits How to import models', () => {
    const shell = makeShell();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <LanguageProvider language="EN">
          <RouteBody shell={shell} route={{ name: 'modelStatus' }} />
        </LanguageProvider>,
      );
    });

    const content = renderedText(tree);
    expect(content).not.toContain('How to import models');

    press(tree, shell.t.goBack);
    press(tree, 'Back to Account & Settings');
    expect(shell.nav.back).toHaveBeenCalledTimes(2);
  });
});
