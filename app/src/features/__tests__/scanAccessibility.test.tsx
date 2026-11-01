import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

import { CaptureScreen } from '../capture/CaptureScreen';
import { CaptureResultScreen } from '../result/CaptureResultScreen';
import { ResultScreen } from '../result/ResultScreen';
import { LanguageProvider, strings } from '../../ui';
import * as preview from '../../preview/previewContent';

const noop = () => {};

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => { tree = renderer.create(element); });
  return tree;
}

function button(tree: ReactTestRenderer, label: string): ReactTestInstance {
  return tree.root.find(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label);
}

function text(tree: ReactTestRenderer, value: string): ReactTestInstance {
  return tree.root.find(node => node.type === Text && node.props.children === value);
}

describe.each([
  ['EN', 'Close camera', 'Choose photo', 'Take photo', 'Flip camera'],
  ['FIL', 'Isara ang kamera', 'Pumili ng larawan', 'Kumuha ng larawan', 'Ibaliktad ang kamera'],
] as const)('capture accessibility in %s (R07/A07, F-07-02-02)', (language, close, choose, take, flip) => {
  test('camera actions expose localized button names, states, and 48 dp targets', () => {
    const t = strings(language);
    const tree = render(
      <LanguageProvider language={language}>
        <CaptureScreen canCapture={false} onClose={noop} onCapture={noop} onPickImage={noop} onFlip={noop} />
      </LanguageProvider>,
    );

    const controls = [close, choose, take, flip].map(label => button(tree, label));
    controls.forEach(control => expect(control.props.accessibilityRole).toBe('button'));
    expect(button(tree, close).props.accessibilityState).toMatchObject({ disabled: false });
    expect(button(tree, choose).props.accessibilityState).toMatchObject({ disabled: false });
    expect(button(tree, take).props.accessibilityState).toMatchObject({ disabled: true });
    expect(button(tree, flip).props.accessibilityState).toMatchObject({ disabled: false });

    for (const label of [close, choose, flip]) {
      const style = StyleSheet.flatten(button(tree, label).props.style);
      expect(style.width ?? style.minWidth).toBeGreaterThanOrEqual(48);
      expect(style.height ?? style.minHeight).toBeGreaterThanOrEqual(48);
    }
    const shutter = StyleSheet.flatten(button(tree, take).props.style);
    expect(shutter.width ?? shutter.minWidth).toBeGreaterThanOrEqual(48);
    expect(shutter.height ?? shutter.minHeight).toBeGreaterThanOrEqual(48);

    const busy = render(
      <LanguageProvider language={language}>
        <CaptureScreen busy onClose={noop} onCapture={noop} onPickImage={noop} onFlip={noop} />
      </LanguageProvider>,
    );
    for (const label of [close, choose, take, flip]) {
      expect(button(busy, label).props.accessibilityState).toMatchObject({ disabled: true });
    }
    expect(text(busy, t.captureSavingLocally)).toBeTruthy();
  });

});

describe.each(['EN', 'FIL'] as const)('capture result accessibility in %s (R08/R09, A08/A09)', language => {
  test('model-free status is a heading, actions are named, and the photo remains local', () => {
    const t = strings(language);
    const tree = render(
      <LanguageProvider language={language}>
        <CaptureResultScreen
          photoUri="file:///owned/scan.jpg"
          onReviewPhoto={noop}
          onBrowseGuidance={noop}
          onStartMonitoring={noop}
          onBackToSummary={noop}
        />
      </LanguageProvider>,
    );

    expect(text(tree, t.resultAnalysisUnavailable).props.accessibilityRole).toBe('header');
    expect(tree.root.findAllByType(Text).some(node => node.props.children === t.resultNotAnalyzed)).toBe(true);
    const photo = tree.root.findAllByType(Image)[0];
    expect(photo).toBeTruthy();
    expect(photo.props.source.uri).toBe('file:///owned/scan.jpg');
    expect(photo.props.accessible).toBe(true);
    expect(photo.props.accessibilityLabel).toBe(t.resultActionReviewPhoto);

    for (const label of [t.resultActionReviewPhoto, t.resultActionBrowseGuidance, t.resultActionStartMonitoring]) {
      expect(button(tree, label).props.accessibilityRole).toBe('button');
      expect(button(tree, label).props.accessibilityLabel).toBe(label);
    }

    const rendered = tree.root.findAllByType(Text).map(node => String(node.props.children)).join(' ');
    const renderedWithoutTruthfulHeadline = rendered
      .replace(/Disease Diagnosis: No Model Weights/gi, '')
      .replace(/Pagsusuri sa Sakit: Walang Model Weights/gi, '');
    expect(renderedWithoutTruthfulHeadline).not.toMatch(/severity|confidence|lesion|healthy|diagnos(?:ed|is)|anthracnose/i);
  });

  test('photo review Back remains a localized, reachable button', () => {
    const t = strings(language);
    const onBackToSummary = jest.fn();
    const tree = render(
      <LanguageProvider language={language}>
        <CaptureResultScreen
          photoUri="file:///owned/scan.jpg"
          view="photo"
          onReviewPhoto={noop}
          onBrowseGuidance={noop}
          onStartMonitoring={noop}
          onBackToSummary={onBackToSummary}
        />
      </LanguageProvider>,
    );

    const back = button(tree, t.resultBackToSummary);
    expect(back.props.accessibilityRole).toBe('button');
    act(() => back.props.onPress());
    expect(onBackToSummary).toHaveBeenCalledTimes(1);
  });
});

test('result presentation renders stages accessibility without sample disclaimer', () => {
  const tree = render(
    <ResultScreen photoUri="file:///scan.jpg" result={preview.RESULT} onStartMonitoring={noop} onAskAssistant={noop} />,
  );
  expect(tree.root.findAllByType(Text).some(n => String(n.props.children).includes('STAGE 1'))).toBe(true);
});
