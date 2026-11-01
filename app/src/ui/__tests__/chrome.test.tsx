import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppBar, Screen, ScreenBody } from '../components/chrome';
import { BottomNav, NoticeBar } from '../components/chrome';
import { press } from '../../testing/interaction';
import { LanguageProvider } from '../i18n/LanguageContext';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 18, left: 0, right: 0 }),
}));

function renderTree(el: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  return tree;
}

test('a menu icon calls onMenu when pressed', () => {
  const onMenu = jest.fn();
  const tree = renderTree(<AppBar title="Chat" menu="menu" onMenu={onMenu} />);
  press(tree, 'Open menu');
  expect(onMenu).toHaveBeenCalledTimes(1);
});

test('Scan launches capture without selecting a tab and tabs preserve selection semantics', () => {
  const onSelect = jest.fn();
  const onScan = jest.fn();
  const tree = renderTree(<BottomNav tabs={[
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'monitoring', label: 'Monitoring', icon: 'leaf' },
    { key: 'chat', label: 'Assistant', icon: 'chat' },
    { key: 'account', label: 'Account', icon: 'user' },
  ]} active="chat" onSelect={onSelect} onScan={onScan} />);
  press(tree, 'Scan a fruit');
  expect(onScan).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
  press(tree, 'Monitoring');
  expect(onSelect).toHaveBeenCalledWith('monitoring');
  const tabs = tree.root.findAll(node => node.props?.accessibilityRole === 'tab');
  expect(new Set(tabs.filter(node => node.props.accessibilityState.selected).map(node => node.props.accessibilityLabel))).toEqual(new Set(['Assistant']));
});

test('safe-area ownership stays in the screen top and floating navigation bottom', () => {
  const tree = renderTree(<Screen testID="screen"><ScreenBody><Text>Content</Text></ScreenBody><BottomNav tabs={[]} active="home" onSelect={() => {}} onScan={() => {}} /></Screen>);
  const view = (testID: string) => tree.root.findAllByType(View).find(node => node.props.testID === testID)!;
  expect(StyleSheet.flatten(view('screen').props.style)).toMatchObject({ paddingTop: 24 });
  expect(StyleSheet.flatten(view('bottom-nav').props.style)).toMatchObject({ paddingBottom: 32 });
  expect(StyleSheet.flatten(view('bottom-nav-pill').props.style).paddingBottom).toBe(8);
});

test('scrolling preserves form button taps with the keyboard open', () => {
  const tree = renderTree(<ScreenBody><Text>Form</Text></ScreenBody>);
  expect(tree.root.findAllByType(ScrollView)[0].props.keyboardShouldPersistTaps).toBe('handled');
  expect(tree.root.findAllByType(ScrollView)[0].props.keyboardDismissMode).toBe('on-drag');
});

test.each([
  ['EN', 'Open menu', 'Go back', 'Dismiss', 'Scan a fruit'],
  ['FIL', 'Buksan ang menu', 'Bumalik', 'Isara', 'Mag-scan ng prutas'],
] as const)('chrome has localized accessible labels in %s', (language, menu, back, dismiss, scan) => {
  const tree = renderTree(
    <LanguageProvider language={language}>
      <>
        <AppBar title="Home" menu="menu" onMenu={() => {}} onBack={() => {}} action="refresh" />
        <NoticeBar message="Notice" onDismiss={() => {}} />
        <BottomNav tabs={[{ key: 'home', label: language === 'EN' ? 'Home' : 'Tahanan', icon: 'home' }]} active="home" onSelect={() => {}} onScan={() => {}} />
      </>
    </LanguageProvider>,
  );
  const buttons = tree.root.findAll(node => node.props?.accessibilityRole === 'button');
  expect(buttons.map(node => node.props.accessibilityLabel)).toEqual(expect.arrayContaining([menu, back, dismiss, scan]));
  expect(buttons.find(node => node.props.accessibilityLabel === menu)?.props.accessibilityState?.disabled).not.toBe(true);
  expect(StyleSheet.flatten(buttons.find(node => node.props.accessibilityLabel === menu)?.props.style)).toMatchObject({ minWidth: 48, minHeight: 48 });
  expect(StyleSheet.flatten(buttons.find(node => node.props.accessibilityLabel === scan)?.props.style)).toMatchObject({ minHeight: 48 });
  expect(tree.root.find(node => node.props?.accessibilityRole === 'tab').props.accessibilityState.selected).toBe(true);
});

it('renders floating bottom nav with elevated center FAB', async () => {
  const onSelect = jest.fn();
  const onScan = jest.fn();
  await render(
    <BottomNav
      tabs={[
        { key: 'home', label: 'Home', icon: 'home' },
        { key: 'monitoring', label: 'Monitoring', icon: 'monitoring' },
        { key: 'chat', label: 'Assistant', icon: 'chat' },
        { key: 'account', label: 'Account', icon: 'account' },
      ]}
      active="home"
      onSelect={onSelect}
      onScan={onScan}
    />
  );
  const pill = screen.getByTestId('bottom-nav-pill');
  expect(pill).toBeTruthy();
  const pillStyle = StyleSheet.flatten(pill.props.style);
  expect(pillStyle.borderRadius).toBe(36);
  expect(pillStyle.height).toBe(64);
  expect(pillStyle.backgroundColor).toBe('#ffffff');
  expect(pillStyle.borderColor).toBe('rgba(21, 77, 46, 0.12)');

  const fab = screen.getByTestId('bottom-nav-fab');
  expect(fab).toBeTruthy();
  const fabStyle = StyleSheet.flatten(fab.props.style);
  expect(fabStyle.width).toBe(52);
  expect(fabStyle.height).toBe(52);
  expect(fabStyle.borderRadius).toBe(26);
  expect(fabStyle.borderWidth).toBe(3);
  expect(fabStyle.borderColor).toBe('#ffffff');

  const scanButton = screen.getByRole('button', { name: /scan/i });
  const scanButtonStyle = StyleSheet.flatten(scanButton.props.style);
  expect(scanButtonStyle.minHeight).toBeGreaterThanOrEqual(48);

  fireEvent.press(scanButton);
  expect(onScan).toHaveBeenCalledTimes(1);
});
