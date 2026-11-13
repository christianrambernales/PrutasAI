import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { render, screen } from '@testing-library/react-native';
import { MonitoringScreen } from '../MonitoringScreen';
import type { MonitoringController } from '../useMonitoring';
import type { MonitoringView } from '../../viewModels';
import { LanguageProvider, strings } from '../../../ui';

const mockView: MonitoringView = {
  id: 'session-123',
  title: 'Test Crop',
  emoji: '🌱',
  overallTrend: 'unavailable',
  checkpoints: [
    {
      id: 'cp-1',
      dayNumber: 1,
      status: 'completed',
      scheduledDate: Date.UTC(2026, 8, 15),
      completedDate: Date.UTC(2026, 8, 15),
      missingFields: [],
      observation: null,
      note: null,
      photoUri: 'file:///test1.jpg',
    },
    {
      id: 'cp-5',
      dayNumber: 5,
      status: 'completed_late',
      scheduledDate: Date.UTC(2026, 8, 20),
      completedDate: Date.UTC(2026, 8, 25),
      missingFields: ['photo_missing'],
      observation: 'better',
      note: 'Looking good',
      photoUri: null,
    },
    {
      id: 'cp-10',
      dayNumber: 10,
      status: 'incomplete',
      scheduledDate: Date.UTC(2026, 8, 30),
      completedDate: null,
      missingFields: ['observation_needed'],
      observation: null,
      note: null,
      photoUri: null,
    },
  ],
};

const mockController = (): MonitoringController => ({
  view: mockView,
  loading: false,
  error: false,
  saving: false,
  draft: null,
  discardConfirmationVisible: false,
  hasUnsavedChanges: false,
  reload: jest.fn(),
  beginCheckpoint: jest.fn(),
  setObservation: jest.fn(),
  setNote: jest.fn(),
  acceptStagedPhoto: jest.fn(),
  removeStagedPhoto: jest.fn(),
  save: jest.fn(),
  requestBack: jest.fn(),
  cancelDiscard: jest.fn(),
  discard: jest.fn(),
});

describe('MonitoringScreen', () => {
  it('renders MonitoringScreen observation grid and timeline', async () => {
    await render(
      <MonitoringScreen
        checkpointTitle="Mangga Carabao #042 • Day 10 Checkpoint"
        currentDay="Day 10 (Today)"
        observationDate="October 9, 2026"
        selectedObservation={null}
        onSelectObservation={jest.fn()}
        notes=""
        onChangeNotes={jest.fn()}
        onSave={jest.fn()}
        onBack={jest.fn()}
      />
    );
    expect(screen.getByText(/Record Observation/i)).toBeTruthy();
    expect(screen.getByText(/Day 10 \(Today\)/i)).toBeTruthy();
    expect(screen.getByText(/Mas Mabuti|Better/i)).toBeTruthy();
    expect(screen.getByText(/Save Observation to SQLite/i)).toBeTruthy();
  });

  it('renders all three days in order with appropriate labels and auto-begins uncompleted checkpoint', () => {
    const ctrl = mockController();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={ctrl}
          expandedCheckpointDay={null}
          onOpenCheckpoint={jest.fn()}
        />
      );
    });
    expect(ctrl.beginCheckpoint).toHaveBeenCalledWith(10);
    const textNodes = tree.root.findAllByType('Text').map((node: any) => node.props.children);
    const textString = textNodes.flat(Infinity).join(' ');
    expect(textString).toContain('Record Observation');
    expect(textString).toContain('Day 1 (Baseline)');
    expect(textString).toContain('Day 5');
    expect(textString).toContain('Day 10 (Today)');
    expect(textString).toContain('Save Observation to SQLite');
    expect(textString).not.toMatch(/diagnosis/i);
    expect(textString).not.toMatch(/percent/i);
  });

  it('renders target checkpoint scheduled date truthfully', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={mockController()}
          expandedCheckpointDay={null}
          onOpenCheckpoint={jest.fn()}
        />
      );
    });
    const day10ScheduledDate = new Date(mockView.checkpoints[2].scheduledDate).toLocaleDateString('en-US');
    const textNodes = tree.root.findAllByType('Text').map((node: any) => String(node.props.children));
    const textString = textNodes.join(' ');
    expect(textString).toContain(day10ScheduledDate);
  });

  it('auto-selects Day 5 when Day 5 is the first uncompleted checkpoint', () => {
    const ctrl = mockController();
    ctrl.view = {
      ...mockView,
      checkpoints: mockView.checkpoints.map(cp =>
        cp.dayNumber === 5 ? { ...cp, status: 'due', completedDate: null, observation: null } : cp,
      ),
    };
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={ctrl}
          expandedCheckpointDay={null}
          onOpenCheckpoint={jest.fn()}
        />
      );
    });
    expect(ctrl.beginCheckpoint).toHaveBeenCalledWith(5);
    const scheduledDate = new Date(mockView.checkpoints[1].scheduledDate).toLocaleDateString('en-US');
    const textNodes = tree.root.findAllByType('Text').map((node: any) => String(node.props.children));
    const textString = textNodes.join(' ');
    expect(textString).toContain('Test Crop • Day 5 Checkpoint');
    expect(textString).toContain(scheduledDate);
  });

  it('never fabricates recovery or healing trends on the Record Observation screen', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={mockController()}
          expandedCheckpointDay={null}
          onOpenCheckpoint={jest.fn()}
        />
      );
    });
    const textNodes = tree.root.findAllByType('Text').map((node: any) => String(node.props.children));
    const textString = textNodes.join(' ');
    expect(textString).toContain('Record Observation');
    expect(textString).not.toMatch(/improving|worsening|healed|recovering|lesion\s*%/i);
  });

  it('handles dirty-form Back confirmation rendering and interactions', () => {
    const ctrl = {
      ...mockController(),
      draft: { dayNumber: 10, observation: 'better', note: 'Field looks good', stagedPhotoUri: null } as any,
      discardConfirmationVisible: true,
    };
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={ctrl}
          expandedCheckpointDay={null}
          onOpenCheckpoint={jest.fn()}
        />
      );
    });
    const textNodes = tree.root.findAllByType('Text').map((node: any) => node.props.children);
    const textString = textNodes.flat(Infinity).join(' ');
    expect(textString).toContain('Discard draft');
    expect(textString).toContain('Keep editing');

    const buttons = tree.root.findAll((node: any) => node.props.accessibilityRole === 'button');
    const keepEditing = buttons.find((node: any) => node.props.accessibilityLabel === 'Keep editing');
    const discardDraft = buttons.find((node: any) => node.props.accessibilityLabel === 'Discard draft');

    expect(keepEditing).toBeTruthy();
    expect(discardDraft).toBeTruthy();

    act(() => keepEditing.props.onPress());
    expect(ctrl.cancelDiscard).toHaveBeenCalledTimes(1);

    act(() => discardDraft.props.onPress());
    expect(ctrl.discard).toHaveBeenCalledTimes(1);
  });

  it.each(['EN', 'FIL'] as const)('%s (R11/A11, F-07-02-02): checkpoint controls announce localized state and chronology', language => {
    const t = strings(language);
    const ctrl = mockController();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <LanguageProvider language={language}>
          <MonitoringScreen
            controller={ctrl}
            expandedCheckpointDay={null}
            onOpenCheckpoint={jest.fn()}
          />
        </LanguageProvider>,
      );
    });

    const buttons = tree.root.findAll((node: any) => node.props.accessibilityRole === 'button');
    const better = buttons.find((node: any) => node.props.accessibilityLabel === t.observationBetter);
    const same = buttons.find((node: any) => node.props.accessibilityLabel === t.observationAboutSame);
    const worse = buttons.find((node: any) => node.props.accessibilityLabel === t.observationWorse);
    const unsure = buttons.find((node: any) => node.props.accessibilityLabel === t.observationUnsure);
    const save = buttons.find((node: any) => node.props.accessibilityLabel === t.monitoringSaveObservation);
    const scheduled = new Date(mockView.checkpoints[2].scheduledDate).toLocaleDateString(language === 'FIL' ? 'fil-PH' : 'en-US');

    expect(better).toBeTruthy();
    expect(same).toBeTruthy();
    expect(worse).toBeTruthy();
    expect(unsure).toBeTruthy();
    expect(save).toBeTruthy();
    expect(save.props.accessibilityState.disabled).toBe(true);

    const currentText = tree.root.findAllByType('Text').map((node: any) => String(node.props.children)).join(' ');
    expect(currentText).toContain(scheduled);

    act(() => better.props.onPress());
    expect(ctrl.setObservation).toHaveBeenCalledWith('better');
  });

  it('R11: Record Observation screen renders without disease or progression claims', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={mockController()}
          expandedCheckpointDay={5}
          onOpenCheckpoint={jest.fn()}
        />,
      );
    });
    const content = tree.root.findAllByType('Text').map((node: any) => String(node.props.children)).join(' ');
    expect(content).toContain('Record Observation');
    expect(content).not.toMatch(/diagnosis|severity|confidence|healthy|progression/i);
  });

  it('R11: save errors are announced and saving disables retry and save actions', () => {
    const controller = {
      ...mockController(),
      error: true,
      saving: true,
      draft: { dayNumber: 10, observation: 'better', note: '', stagedPhotoUri: null } as any,
    };
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen controller={controller} expandedCheckpointDay={null} onOpenCheckpoint={jest.fn()} />,
      );
    });

    const alert = tree.root.find((node: any) => node.props.accessibilityRole === 'alert');
    expect(alert.props.children).toBe(strings('EN').localErrorGeneric);
    for (const label of ['Try again', 'Save observation']) {
      const action = tree.root.find((node: any) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label);
      expect(action.props.accessibilityState.disabled).toBe(true);
    }
  });

  it('R11: GreenTopCell Back button invokes dirty-draft protection without asserting hardware Back', () => {
    const controller = {
      ...mockController(),
      draft: { dayNumber: 10, observation: 'better', note: '', stagedPhotoUri: null } as any,
    };
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen controller={controller} expandedCheckpointDay={null} onOpenCheckpoint={jest.fn()} />,
      );
    });
    const back = tree.root.find((node: any) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Back');
    expect(back).toBeTruthy();
    act(() => back.props.onPress());
    expect(controller.requestBack).toHaveBeenCalledTimes(1);
  });

  it('allows selecting each self-report observation chip', () => {
    const ctrl = {
      ...mockController(),
      draft: { dayNumber: 10, observation: null, note: '', stagedPhotoUri: null } as any,
    };
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={ctrl}
          expandedCheckpointDay={null}
          onOpenCheckpoint={jest.fn()}
        />
      );
    });
    const buttons = tree.root.findAll((node: any) => node.props.accessibilityRole === 'button');
    const betterBtn = buttons.find((node: any) => node.props.accessibilityLabel === 'Better');
    const sameBtn = buttons.find((node: any) => node.props.accessibilityLabel === 'About the same');
    const worseBtn = buttons.find((node: any) => node.props.accessibilityLabel === 'Worse');
    const unsureBtn = buttons.find((node: any) => node.props.accessibilityLabel === 'Unsure');

    expect(betterBtn).toBeTruthy();
    expect(sameBtn).toBeTruthy();
    expect(worseBtn).toBeTruthy();
    expect(unsureBtn).toBeTruthy();

    act(() => betterBtn.props.onPress());
    expect(ctrl.setObservation).toHaveBeenCalledWith('better');

    act(() => sameBtn.props.onPress());
    expect(ctrl.setObservation).toHaveBeenCalledWith('same');

    act(() => worseBtn.props.onPress());
    expect(ctrl.setObservation).toHaveBeenCalledWith('worse');

    act(() => unsureBtn.props.onPress());
    expect(ctrl.setObservation).toHaveBeenCalledWith('unsure');
  });

  it('enables save when observation is chosen and calls save; disabled when saving', () => {
    const ctrl = {
      ...mockController(),
      draft: { dayNumber: 10, observation: 'better', note: 'Leaf healed', stagedPhotoUri: null } as any,
      saving: false,
    };
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={ctrl}
          expandedCheckpointDay={null}
          onOpenCheckpoint={jest.fn()}
        />
      );
    });
    const saveBtn = tree.root.find((node: any) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Save observation');
    expect(saveBtn.props.accessibilityState.disabled).toBe(false);

    act(() => saveBtn.props.onPress());
    expect(ctrl.save).toHaveBeenCalledTimes(1);
  });

  it('does not render extra photo upload box or Back to timeline button inside observation card', () => {
    const ctrl = {
      ...mockController(),
      draft: { dayNumber: 10, observation: 'better', note: '', stagedPhotoUri: null } as any,
    };
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MonitoringScreen
          controller={ctrl}
          expandedCheckpointDay={null}
          onOpenCheckpoint={jest.fn()}
        />
      );
    });
    const textNodes = tree.root.findAllByType('Text').map((node: any) => String(node.props.children));
    const textString = textNodes.join(' ');
    expect(textString).not.toContain('Photo not added');
    expect(textString).not.toContain('Add photo');
    expect(textString).not.toContain('Back to timeline');
  });
});
