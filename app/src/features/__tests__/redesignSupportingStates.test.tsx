import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { ModelStatusScreen } from '../modelStatus/ModelStatusScreen';
import { ModelStatusView } from '../modelStatus/ModelStatusView';
import { TrashScreen } from '../trash/TrashScreen';
import { WelcomeScreen } from '../welcome/WelcomeScreen';
import { LanguagePickScreen } from '../language/LanguagePickScreen';
import { ConsentScreen } from '../consent/ConsentScreen';
import { ErrorBoundary } from '../../ui/components/ErrorBoundary';
import { LanguageProvider, strings } from '../../ui';
import { RETENTION_DAYS } from '../../core/sync/purgeTrash';
import { press, pressAsync, textOf } from '../../testing/interaction';
import type { ConversationSummary } from '../../core/db/repositories/conversations';
import type { Language } from '../../ui';

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
}

const emptyFruits = {
  banana: { validatedRoles: [], prerequisiteValidatedRoles: [] },
  mango: { validatedRoles: [], prerequisiteValidatedRoles: [] },
  papaya: { validatedRoles: [], prerequisiteValidatedRoles: [] },
};

describe('Redesign Supporting States (Stage 11 & Prototype v2 1:1 Alignment)', () => {
  describe('ModelStatusScreen & ModelStatusView (Screen 17)', () => {
    it('truthfully displays unverified inference and thesis phase disclosure without claiming ready to diagnose', () => {
      const onBack = jest.fn();
      const t = strings('EN');
      const tree = render(
        <LanguageProvider language="EN">
          <ModelStatusScreen language="EN" onBack={onBack} />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain(t.modelInferenceUnverified);
      expect(text).not.toContain('Ready to diagnose');
      expect(text).toContain(t.thesisPhaseDisclosure);
      expect(text).toContain(t.thesisPhaseDisclosureDetail);
      expect(text).toContain(t.pipelineStagesTitle);
      expect(text).toContain(t.pipelineStage1Title);
      expect(text).toContain(t.pipelineStage2Title);
      expect(text).toContain(t.pipelineStage3Title);

      press(tree, t.goBack);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders truthful model status view in Filipino', () => {
      const t = strings('FIL');
      const tree = render(
        <LanguageProvider language="FIL">
          <ModelStatusScreen language="FIL" />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain(t.modelInferenceUnverified);
      expect(text).toContain(t.thesisPhaseDisclosure);
      expect(text).toContain(t.thesisPhaseDisclosureDetail);
      expect(text).toContain(t.pipelineStagesTitle);
    });

    it('renders empty declared models truthfully in ModelStatusView fixture', () => {
      const t = strings('EN');
      const tree = render(
        <LanguageProvider language="EN">
          <ModelStatusView
            headline={t.modelStatusEmptyHeadline}
            models={[]}
            fruits={emptyFruits}
            manifestVersion={1}
            t={t}
          />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain(t.modelStatusEmptyHeadline);
      expect(text).toContain(t.noModelsDeclared);
    });

    it('renders ModelStatusScreen matching prototype stages 1:1', () => {
      const onBack = jest.fn();
      const tree = render(
        <LanguageProvider language="EN">
          <ModelStatusScreen onBack={onBack} language="EN" />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain('AI Model Registry');
      expect(text).toContain('On-Device Neural Pipeline Health');
      expect(text).toContain('Thesis Phase Disclosure');
      expect(text).toContain('No model weights are bundled in this current verification phase');
      expect(text).toContain('Stage 1: Fruit Detector (YOLO)');
      expect(text).toContain('Stage 2: Variety Classifier');
      expect(text).toContain('Stage 3: Disease & Lesion Segmentation');
      expect(text).toContain('No Weights');

      press(tree, 'Back to Account & Settings');
      expect(onBack).toHaveBeenCalled();
    });

    it('renders ModelStatusScreen in Filipino matching prototype 1:1', () => {
      const onBack = jest.fn();
      const tree = render(
        <LanguageProvider language="FIL">
          <ModelStatusScreen onBack={onBack} language="FIL" />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain('Katayuan ng AI Model');
      expect(text).toContain('On-Device Inference Pipeline Health');
      expect(text).toContain('Yugto ng Thesis Prototype');
      expect(text).toContain('Walang model weights file na naka-bundle sa phase na ito');
      expect(text).toContain('Mga Yugto ng Pipeline (Pipeline Stages)');
      expect(text).toContain('Walang Weights');
      expect(text).toContain('Bumalik sa Account & Settings');
    });
  });

  describe('TrashScreen (Screen 18)', () => {
    const fakeConversation: ConversationSummary = {
      uuid: 'conv-test-123',
      title: 'Mango blossom blight inquiry',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      deletedAt: '2026-10-05T00:00:00.000Z',
    };

    it('displays 15-day retention notice and empty state when no items in trash', () => {
      const t = strings('EN');
      const tree = render(
        <LanguageProvider language="EN">
          <TrashScreen
            conversations={[]}
            onRestore={jest.fn()}
            onDeleteForever={jest.fn()}
          />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain(t.trashRetentionNotice);
      expect(text).toContain(String(RETENTION_DAYS));
      expect(text).toContain(t.trashEmpty);
    });

    it('renders trashed conversations and invokes onRestore when restore is pressed', async () => {
      const t = strings('EN');
      const onRestore = jest.fn().mockResolvedValue(undefined);
      const onDeleteForever = jest.fn().mockResolvedValue(undefined);
      const fixedNow = () => new Date('2026-10-06T00:00:00.000Z');

      const tree = render(
        <LanguageProvider language="EN">
          <TrashScreen
            conversations={[fakeConversation]}
            onRestore={onRestore}
            onDeleteForever={onDeleteForever}
            now={fixedNow}
          />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain(fakeConversation.title);

      press(tree, fakeConversation.title);
      await pressAsync(tree, t.restore);
      expect(onRestore).toHaveBeenCalledWith([fakeConversation.uuid]);
    });

    it('handles selection and confirmed permanent delete', async () => {
      const t = strings('EN');
      const onRestore = jest.fn();
      const onDeleteForever = jest.fn().mockResolvedValue(undefined);

      const tree = render(
        <LanguageProvider language="EN">
          <TrashScreen
            conversations={[fakeConversation]}
            onRestore={onRestore}
            onDeleteForever={onDeleteForever}
          />
        </LanguageProvider>,
      );

      // Select row
      press(tree, fakeConversation.title);

      // Press Delete permanently button
      press(tree, t.deleteForever);

      // Confirm modal pops up -> confirm delete
      await pressAsync(tree, t.deleteForever);
      expect(onDeleteForever).toHaveBeenCalledWith([fakeConversation.uuid]);
    });

    it('invokes onBack when Back is pressed', () => {
      const t = strings('EN');
      const onBack = jest.fn();
      const tree = render(
        <LanguageProvider language="EN">
          <TrashScreen
            conversations={[]}
            onRestore={jest.fn()}
            onDeleteForever={jest.fn()}
            onBack={onBack}
          />
        </LanguageProvider>,
      );

      press(tree, t.goBack);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders TrashScreen with 15-day notice and restore button matching prototype', () => {
      const onRestore = jest.fn();
      const onBack = jest.fn();
      const tree = render(
        <LanguageProvider language="EN">
          <TrashScreen
            trashedItems={[{ id: '1', title: 'Anthracnose chat', deletedDate: 'Deleted Oct 8, 2026' }]}
            onRestore={onRestore}
            onBack={onBack}
          />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain('Trash Manager');
      expect(text).toContain('15-Day retention policy before permanent purge');
      expect(text).toContain('Notice: Only chat conversations support soft-delete retention');
      expect(text).toContain('Anthracnose chat');
      expect(text).toContain('Deleted Oct 8, 2026');
      expect(text).toContain('Restore');

      press(tree, 'Restore Anthracnose chat');
      expect(onRestore).toHaveBeenCalledWith(['1']);

      press(tree, 'Back to Account');
      expect(onBack).toHaveBeenCalled();
    });

    it('renders TrashScreen empty state in Filipino matching prototype', () => {
      const onBack = jest.fn();
      const tree = render(
        <LanguageProvider language="FIL">
          <TrashScreen
            conversations={[]}
            language="FIL"
            onRestore={jest.fn()}
            onBack={onBack}
          />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain('Basurahan (Trash)');
      expect(text).toContain('15-Araw na soft-delete bago tuluyang burahin');
      expect(text).toContain('Walang laman ang basurahan.');
      expect(text).toContain('Bumalik sa Account');
    });
  });

  describe('WelcomeScreen (Screen 19)', () => {
    it('renders welcome card, language selector, and routes to offline setup', async () => {
      const t = strings('EN');
      const onContinueOffline = jest.fn();
      const onSelectLanguage = jest.fn();
      const onSignIn = jest.fn();

      const tree = render(
        <LanguageProvider language="EN">
          <WelcomeScreen
            onContinueOffline={onContinueOffline}
            onSelectLanguage={onSelectLanguage}
            onSignIn={onSignIn}
          />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain(t.welcomeHeaderTitle);
      expect(text).toContain(t.welcomePathOfflineTitle);
      expect(text).toContain(t.welcomePathAccountTitle);

      // Language toggle
      press(tree, 'FIL');
      expect(onSelectLanguage).toHaveBeenCalledWith('FIL');

      // Offline card selection and submit
      press(tree, 'Use offline');
      await pressAsync(tree, t.onboardingFinishSetup);
      expect(onContinueOffline).toHaveBeenCalledTimes(1);

      // Login link
      await pressAsync(tree, t.welcomeAlreadyHaveAccount);
      expect(onSignIn).toHaveBeenCalledTimes(1);
    });

    it('routes to account setup when account path is chosen', async () => {
      const t = strings('EN');
      const onCreateAccount = jest.fn();

      const tree = render(
        <LanguageProvider language="EN">
          <WelcomeScreen onCreateAccount={onCreateAccount} />
        </LanguageProvider>,
      );

      press(tree, 'Sign in or create an account');
      await pressAsync(tree, t.onboardingReviewConsent);
      expect(onCreateAccount).toHaveBeenCalledTimes(1);
    });

    it('renders WelcomeScreen matching prototype onboarding cards', () => {
      const onSelectLanguage = jest.fn();
      const onContinueOffline = jest.fn();
      const onCreateAccount = jest.fn();
      const onLogin = jest.fn();

      const tree = render(
        <LanguageProvider language="EN">
          <WelcomeScreen
            currentLanguage="EN"
            onSelectLanguage={onSelectLanguage}
            onContinueOffline={onContinueOffline}
            onCreateAccount={onCreateAccount}
            onLogin={onLogin}
          />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain('Maligayang Pagdating sa PrutasAI');
      expect(text).toContain('Decision-support tool for Mango, Banana, and Papaya growers');
      expect(text).toContain('Select Language');
      expect(text).toContain('Continue Fully Offline (Recommended)');
      expect(text).toContain('No registration needed. Photographs and records remain completely on-device.');
      expect(text).toContain('Create Account (Optional Sync)');
      expect(text).toContain('Sync monitoring checkpoints across devices using your email.');
      expect(text).toContain('Already have an account? Log In');

      press(tree, 'Filipino language');
      expect(onSelectLanguage).toHaveBeenCalledWith('FIL');

      press(tree, 'Already have an account? Log In');
      expect(onLogin).toHaveBeenCalledTimes(1);
    });

    it('renders WelcomeScreen in Filipino matching prototype 1:1', () => {
      const tree = render(
        <LanguageProvider language="FIL">
          <WelcomeScreen
            currentLanguage="FIL"
            onSelectLanguage={jest.fn()}
            onContinueOffline={jest.fn()}
            onCreateAccount={jest.fn()}
            onLogin={jest.fn()}
          />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain('Maligayang Pagdating sa PrutasAI');
      expect(text).toContain('Pangsuporta sa desisyon sa pananim na Mangga, Saging, at Papaya');
      expect(text).toContain('Piliin ang Wika');
      expect(text).toContain('Magpatuloy nang Ganap na Offline (Rekomendado)');
      expect(text).toContain('Walang account o internet na kailangan');
      expect(text).toContain('Gumawa ng Account (Opsyonal na Cloud Sync)');
      expect(text).toContain('Mayroon nang account? Mag-log in');
    });
  });

  describe('LanguagePickScreen', () => {
    it('allows picking a language and continues', async () => {
      const t = strings('EN');
      const onPick = jest.fn();

      const tree = render(
        <LanguageProvider language="EN">
          <LanguagePickScreen onPick={onPick} />
        </LanguageProvider>,
      );

      // Select Filipino
      press(tree, t.languageFilipino);
      await pressAsync(tree, t.onboardingContinueToMode);
      expect(onPick).toHaveBeenCalledWith('FIL');
    });
  });

  describe('ConsentScreen', () => {
    it('renders consent disclosures and acknowledges', async () => {
      const t = strings('EN');
      const onAcknowledge = jest.fn();

      const tree = render(
        <LanguageProvider language="EN">
          <ConsentScreen onAcknowledge={onAcknowledge} />
        </LanguageProvider>,
      );

      const text = textOf(tree.root);
      expect(text).toContain(t.consentTitle);
      expect(text).toContain(t.consentSent);
      expect(text).toContain(t.consentNeverSent);

      await pressAsync(tree, t.onboardingFinishSetup);
      expect(onAcknowledge).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorBoundary', () => {
    function ThrowingChild(): React.ReactElement {
      throw new Error('Test crash in child component');
    }

    it('catches render errors and displays fallback with details without swallowing', () => {
      const t = strings('EN');
      // Silence React boundary console.error for expected test error
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const tree = render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>,
      );

      const text = textOf(tree.root);
      expect(text).toContain(t.unexpectedErrorTitle);
      expect(text).toContain('Test crash in child component');
      spy.mockRestore();
    });
  });
});
