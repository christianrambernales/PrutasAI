import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import type { ModelRegistry } from '../../../core/ml/registry';
import type { ModelRoleId, SupportedFruit } from '../../../core/ml/manifest';
import type { ModelRow } from '../../viewModels';
import { strings, type Language } from '../../../ui/i18n/strings';
import { ModelStatusView } from '../ModelStatusView';

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
    'renders %s status without a diagnostic claim', kind => {
      const content = renderedText(renderStatus(kind, language));

      expect(content).toContain(t.modelInferenceUnverified);
      expect(content).toContain(t.howToImportModels);
      expect(content).not.toMatch(/diagnos(?:is|tic)/i);

      if (kind === 'empty') {
        expect(content).toContain(t.noModelsDeclared);
        expect(content).toContain(t.modelNotDeclared);
      } else if (kind === 'banana-partial') {
        expect(content).toContain(t.fruitBanana);
        expect(content).toContain(t.fruitMango);
        expect(content).toContain(t.fruitPapaya);
        expect(content).toContain(t.modelBuildValidated);
        expect(content).toContain(t.modelNotDeclared);
      } else if (kind === 'invalid') {
        expect(content).toContain(t.modelValidationFailed);
      } else {
        expect(content.match(new RegExp(t.modelBuildValidated, 'g'))).toHaveLength(9);
      }
    },
  );
});
