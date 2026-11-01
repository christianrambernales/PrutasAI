import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  GreenTopCell,
  FrostedCard,
  BtnOrangeFull,
  BtnForestFull,
  BtnOutline,
  BtnSubtle,
  StatusBadge,
  CropCircleAvatar,
} from '../index';

describe('Prototype Primitives', () => {
  describe('GreenTopCell', () => {
    it('renders with title, subtitle, and badges', async () => {
      await render(
        <GreenTopCell
          title="Good day!"
          subtitle="Decision-support for your fruit crops"
          badge={{ label: 'Local Offline Mode', variant: 'offline' }}
          testID="green-top-cell"
        />
      );
      const cellEl = screen.getByTestId('green-top-cell');
      const flattenedStyle = StyleSheet.flatten(cellEl.props.style);
      expect(flattenedStyle.overflow).toBeUndefined();

      const titleEl = screen.getByText('Good day!');
      expect(titleEl).toBeTruthy();
      expect(titleEl.props.accessibilityRole).toBe('header');
      expect(screen.getByText('Decision-support for your fruit crops')).toBeTruthy();
      expect(screen.getByText('Local Offline Mode')).toBeTruthy();
    });

    it('renders centered layout with actions and header icon', async () => {
      await render(
        <GreenTopCell
          title="Centered Title"
          subtitle="Centered Subtitle"
          badge={{ label: 'Centered Badge', variant: 'offline' }}
          headerIcon={<Text testID="header-icon">🌾</Text>}
          leftAction={<Text testID="left-action">←</Text>}
          rightAction={<Text testID="right-action">Settings</Text>}
          centered
        />
      );
      expect(screen.getByText('Centered Title')).toBeTruthy();
      expect(screen.getByText('Centered Subtitle')).toBeTruthy();
      expect(screen.getByTestId('header-icon')).toBeTruthy();
      expect(screen.getByTestId('left-action')).toBeTruthy();
      expect(screen.getByTestId('right-action')).toBeTruthy();

      const badgeText = screen.getByText('Centered Badge');
      const badgeParent = badgeText.parent;
      const flattenedBadgeStyle = StyleSheet.flatten(badgeParent?.props.style);
      expect(flattenedBadgeStyle.alignSelf).toBe('center');
    });
  });

  describe('FrostedCard', () => {
    it('renders with accent borders', async () => {
      await render(
        <>
          <FrostedCard accentBorder="forest"><Text>Card forest</Text></FrostedCard>
          <FrostedCard accentBorder="orange"><Text>Card orange</Text></FrostedCard>
          <FrostedCard accentBorder="amber"><Text>Card amber</Text></FrostedCard>
          <FrostedCard accentBorder="healthy"><Text>Card healthy</Text></FrostedCard>
          <FrostedCard accentBorder="info"><Text>Card info</Text></FrostedCard>
          <FrostedCard accentBorder="severe"><Text>Card severe</Text></FrostedCard>
          <FrostedCard accentBorder="dashed-orange"><Text>Card dashed</Text></FrostedCard>
          <FrostedCard accentBorder="none"><Text>Card none</Text></FrostedCard>
        </>
      );
      expect(screen.getByText('Card forest')).toBeTruthy();
      expect(screen.getByText('Card orange')).toBeTruthy();
      expect(screen.getByText('Card amber')).toBeTruthy();
      expect(screen.getByText('Card healthy')).toBeTruthy();
      expect(screen.getByText('Card info')).toBeTruthy();
      expect(screen.getByText('Card severe')).toBeTruthy();
      expect(screen.getByText('Card dashed')).toBeTruthy();
      expect(screen.getByText('Card none')).toBeTruthy();
    });

    it('fires onPress when pressable', async () => {
      const onPress = jest.fn();
      await render(
        <FrostedCard onPress={onPress}>
          <Text>Clickable Card</Text>
        </FrostedCard>
      );
      await fireEvent.press(screen.getByText('Clickable Card'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('PrototypeButtons', () => {
    it('fires onPress on active buttons', async () => {
      const onOrange = jest.fn();
      const onForest = jest.fn();
      const onOutline = jest.fn();
      const onSubtle = jest.fn();

      await render(
        <>
          <BtnOrangeFull label="Take Photo" onPress={onOrange} testID="btn-orange" />
          <BtnForestFull label="Save Note" onPress={onForest} />
          <BtnOutline label="Pick from Gallery" onPress={onOutline} />
          <BtnSubtle label="View History" onPress={onSubtle} testID="btn-subtle" />
        </>
      );

      await fireEvent.press(screen.getByText('Take Photo'));
      expect(onOrange).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByText('Save Note'));
      expect(onForest).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByText('Pick from Gallery'));
      expect(onOutline).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByText('View History'));
      expect(onSubtle).toHaveBeenCalledTimes(1);

      // Verify BtnSubtle hitSlop
      const subtleBtn = screen.getByTestId('btn-subtle');
      expect(subtleBtn.props.hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });

      // Verify BtnOrangeFull shadow and inner gradient overflow
      const orangeBtn = screen.getByTestId('btn-orange');
      const flattenedOrangeStyle = StyleSheet.flatten(orangeBtn.props.style);
      expect(flattenedOrangeStyle.overflow).toBeUndefined();
    });

    it('does not fire onPress when disabled', async () => {
      const onOrange = jest.fn();
      const onForest = jest.fn();
      const onOutline = jest.fn();
      const onSubtle = jest.fn();

      await render(
        <>
          <BtnOrangeFull label="Disabled Orange" onPress={onOrange} disabled />
          <BtnForestFull label="Disabled Forest" onPress={onForest} disabled />
          <BtnOutline label="Disabled Outline" onPress={onOutline} disabled />
          <BtnSubtle label="Disabled Subtle" onPress={onSubtle} disabled />
        </>
      );

      await fireEvent.press(screen.getByText('Disabled Orange'));
      expect(onOrange).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByText('Disabled Forest'));
      expect(onForest).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByText('Disabled Outline'));
      expect(onOutline).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByText('Disabled Subtle'));
      expect(onSubtle).not.toHaveBeenCalled();
    });

    it('renders icon and custom text color on BtnSubtle', async () => {
      await render(
        <BtnSubtle
          label="Custom Color"
          textColor="#c2410c"
          icon={<Text testID="subtle-icon">🔍</Text>}
        />
      );
      expect(screen.getByText('Custom Color')).toBeTruthy();
      expect(screen.getByTestId('subtle-icon')).toBeTruthy();
    });
  });

  describe('StatusBadge', () => {
    it('renders all badge variants', async () => {
      await render(
        <>
          <StatusBadge variant="offline" label="Badge offline" />
          <StatusBadge variant="sample" label="Badge sample" />
          <StatusBadge variant="healthy" label="Badge healthy" />
          <StatusBadge variant="warning" label="Badge warning" />
          <StatusBadge variant="info" label="Badge info" />
          <StatusBadge variant="severe" label="Badge severe" />
        </>
      );
      expect(screen.getByText('Badge offline')).toBeTruthy();
      expect(screen.getByText('Badge sample')).toBeTruthy();
      expect(screen.getByText('Badge healthy')).toBeTruthy();
      expect(screen.getByText('Badge warning')).toBeTruthy();
      expect(screen.getByText('Badge info')).toBeTruthy();
      expect(screen.getByText('Badge severe')).toBeTruthy();
    });
  });

  describe('CropCircleAvatar', () => {
    it('renders correct emoji for known crops and custom emoji', async () => {
      const { rerender } = await render(<CropCircleAvatar crop="mango" size={48} testID="crop-avatar" />);
      expect(screen.getByText('🥭')).toBeTruthy();
      const avatar = screen.getByTestId('crop-avatar');
      expect(avatar.props.accessible).toBe(false);

      await rerender(<CropCircleAvatar crop="banana" />);
      expect(screen.getByText('🍌')).toBeTruthy();

      await rerender(<CropCircleAvatar crop="papaya" />);
      expect(screen.getByText('🍈')).toBeTruthy();

      await rerender(<CropCircleAvatar crop="unknown" />);
      expect(screen.getByText('🌱')).toBeTruthy();

      await rerender(<CropCircleAvatar emoji="🍎" accessibilityLabel="Apple fruit" testID="crop-avatar-labeled" />);
      expect(screen.getByText('🍎')).toBeTruthy();
      const labeledAvatar = screen.getByTestId('crop-avatar-labeled');
      expect(labeledAvatar.props.accessibilityLabel).toBe('Apple fruit');
      expect(labeledAvatar.props.accessibilityRole).toBe('image');
      expect(labeledAvatar.props.accessible).toBe(true);
    });
  });
});
