import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Button, PressableRow, Segmented, Toggle } from '../components/controls';
import { AppText, FontProvider, SectionHeader } from '../components/primitives';
import { COLORS, FONTS } from '../tokens';

describe('redesigned controls preserve accessible interactions', () => {
  it('does not activate disabled buttons and preserves the visible accessible name', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' }).props.accessibilityState.disabled).toBe(true);
  });

  it('shows and clears keyboard focus without changing the touch target', async () => {
    await render(<Button label="I-save ang pagbabago" />);
    const button = screen.getByRole('button', { name: 'I-save ang pagbabago' });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(48);
    await fireEvent(button, 'focus');
    expect(StyleSheet.flatten(button.props.style).borderColor).toBe('#0284c7');
    await fireEvent(button, 'blur');
    expect(StyleSheet.flatten(button.props.style).borderColor).not.toBe('#0284c7');
  });

  it('keeps translated option labels distinct from selected values', async () => {
    const onChange = jest.fn();
    await render(<Segmented options={[{ value: 'same', label: 'Walang pagbabago' }, { value: 'better', label: 'Mas mabuti' }]} value="same" fullWidth onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Walang pagbabago' }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Mas mabuti' }));
    expect(onChange).toHaveBeenCalledWith('better');
  });

  it('preserves named switches and disabled drilldown rows', async () => {
    const onPress = jest.fn();
    await render(<><Toggle on accessibilityLabel="Cloud sync" onPress={onPress} /><PressableRow accessibilityLabel="Open record" disabled onPress={onPress}>{null}</PressableRow></>);
    expect(screen.getByRole('switch', { name: 'Cloud sync' }).props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Open record' }));
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('switch', { name: 'Cloud sync' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses a real bundled weight when ready and allows system fallback and text scaling', async () => {
    const view = await render(<FontProvider value={false}><AppText variant="title">PrutasAI</AppText></FontProvider>);
    expect(StyleSheet.flatten(screen.getByText('PrutasAI').props.style).fontFamily).toBeUndefined();
    await view.rerender(<FontProvider value><AppText variant="title">PrutasAI</AppText></FontProvider>);
    const heading = screen.getByText('PrutasAI');
    expect(StyleSheet.flatten(heading.props.style)).toMatchObject({ fontFamily: FONTS.extraBold, fontWeight: 'normal' });
    expect(heading.props.allowFontScaling).not.toBe(false);
  });

  it('preserves custom weight overrides, heading semantics and wrapping labels', async () => {
    await render(<FontProvider value><AppText style={{ fontWeight: '500' }}>Body</AppText><AppText style={{ fontWeight: 700 }}>Bold body</AppText><SectionHeader title="Mga kamakailang tala ng pag-scan" /></FontProvider>);
    expect(StyleSheet.flatten(screen.getByText('Body').props.style).fontFamily).toBe(FONTS.medium);
    expect(StyleSheet.flatten(screen.getByText('Bold body').props.style).fontFamily).toBe(FONTS.bold);
    expect(screen.getByRole('header', { name: 'Mga kamakailang tala ng pag-scan' })).toBeTruthy();
  });

  it('renders readable white text on the approved orange action surface', async () => {
    await render(<Button label="Scan" variant="accent" />);
    const labelStyle = StyleSheet.flatten(screen.getByText('Scan').props.style);
    expect(labelStyle.color).toBe(COLORS.surface);
    expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Scan' }).props.style).backgroundColor).toBe(COLORS.accent);
  });
});
