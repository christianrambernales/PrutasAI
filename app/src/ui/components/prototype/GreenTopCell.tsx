import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../tokens';
import { StatusBadge, StatusBadgeVariant } from './StatusBadge';

export interface GreenTopCellBadge {
  label: string;
  variant?: StatusBadgeVariant;
}

export interface GreenTopCellProps {
  title: string;
  subtitle?: string;
  badge?: GreenTopCellBadge;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  headerIcon?: React.ReactNode;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function GreenTopCell({
  title,
  subtitle,
  badge,
  leftAction,
  rightAction,
  headerIcon,
  centered = false,
  style,
  testID,
}: GreenTopCellProps) {
  return (
    <View testID={testID} style={[styles.outerContainer, style]}>
      <LinearGradient
        colors={['#154d2e', '#0b2b19']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          centered && styles.centeredGradient,
        ]}
      >
        <View style={[styles.row, centered && styles.centeredRow]}>
          {leftAction ? <View style={styles.leftAction}>{leftAction}</View> : null}

          <View
            style={[
              styles.contentCol,
              centered && styles.centeredCol,
              Boolean(leftAction || rightAction) && styles.flexContent,
            ]}
          >
            {headerIcon ? <View style={styles.headerIcon}>{headerIcon}</View> : null}
            {badge ? (
              <View style={[styles.badgeWrapper, centered && styles.centeredBadge]}>
                <StatusBadge
                  variant={badge.variant ?? 'offline'}
                  label={badge.label}
                  style={centered ? { alignSelf: 'center' } : undefined}
                />
              </View>
            ) : null}
            <Text
              accessibilityRole="header"
              style={[
                styles.title,
                centered && styles.centeredText,
              ]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  centered && styles.centeredText,
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#0f2d19',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    flexShrink: 0,
    width: '100%',
  },
  gradient: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: '100%',
  },
  centeredGradient: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  centeredRow: {
    justifyContent: 'center',
    width: '100%',
  },
  leftAction: {
    marginRight: 10,
  },
  rightAction: {
    marginLeft: 10,
  },
  contentCol: {
    flexDirection: 'column',
    flex: 1,
  },
  flexContent: {
    flex: 1,
  },
  centeredCol: {
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  headerIcon: {
    marginBottom: 6,
  },
  badgeWrapper: {
    marginBottom: 6,
  },
  centeredBadge: {
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    fontFamily: FONTS.extraBold,
    letterSpacing: -0.4,
    maxWidth: '100%',
  },
  subtitle: {
    color: '#d1fae5',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontFamily: FONTS.medium,
    marginTop: 4,
    maxWidth: '100%',
  },
  centeredText: {
    textAlign: 'center',
  },
});
