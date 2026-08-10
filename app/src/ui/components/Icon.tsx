import React from 'react';
import { View, ViewStyle } from 'react-native';
import { COLORS } from '../tokens';

/**
 * Icons drawn from layout primitives so the app carries no icon or SVG
 * dependency. The name/size/colour API is the contract the screens use — the
 * drawing can be swapped for real vector paths later without touching them.
 */

export type IconName =
  | 'home' | 'cloud' | 'cloudRain' | 'chat' | 'history' | 'camera' | 'gear'
  | 'chevronRight' | 'chevronLeft' | 'chevronDown' | 'arrowLeft' | 'close'
  | 'check' | 'plus' | 'search' | 'send' | 'sparkle' | 'warning' | 'info'
  | 'refresh' | 'trash' | 'download' | 'pin' | 'droplet' | 'mountain' | 'sun'
  | 'leaf' | 'thermometer' | 'trendingDown' | 'wifi' | 'wifiOff' | 'globe'
  | 'shield' | 'package' | 'file' | 'calendar' | 'image';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const S = (style: ViewStyle, key: string | number) => <View key={key} style={style} />;

/** A rounded stroke of the given length and thickness. */
const bar = (
  key: string | number,
  color: string,
  w: number,
  h: number,
  style: ViewStyle = {},
): React.ReactElement =>
  S({ position: 'absolute', backgroundColor: color, width: w, height: h, borderRadius: Math.min(w, h) / 2, ...style }, key);

/** An outlined circle. */
const ring = (
  key: string | number,
  color: string,
  d: number,
  t: number,
  style: ViewStyle = {},
): React.ReactElement =>
  S({ position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: t, borderColor: color, ...style }, key);

const disc = (key: string | number, color: string, d: number, style: ViewStyle = {}): React.ReactElement =>
  S({ position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: color, ...style }, key);

const triangle = (
  key: string | number,
  color: string,
  w: number,
  h: number,
  style: ViewStyle = {},
): React.ReactElement =>
  S({
    position: 'absolute', width: 0, height: 0, backgroundColor: 'transparent',
    borderLeftWidth: w / 2, borderRightWidth: w / 2, borderBottomWidth: h,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
    ...style,
  }, key);

/** Two adjacent borders on a rotated square — the classic chevron. */
const chevron = (key: string | number, color: string, s: number, t: number, deg: number, style: ViewStyle = {}) =>
  S({
    position: 'absolute', width: s, height: s,
    borderRightWidth: t, borderBottomWidth: t, borderColor: color,
    borderTopWidth: 0, borderLeftWidth: 0,
    transform: [{ rotate: `${deg}deg` }], ...style,
  }, key);

function draw(name: IconName, s: number, c: string): React.ReactElement[] {
  const t = Math.max(1.5, s * 0.085); // stroke weight
  const mid = s / 2;
  switch (name) {
    case 'home':
      return [
        S({ position: 'absolute', width: s * 0.62, height: s * 0.62, left: s * 0.19, top: s * 0.02,
          borderWidth: t, borderColor: c, borderRadius: t, transform: [{ rotate: '45deg' }] }, 'r'),
        S({ position: 'absolute', left: s * 0.16, top: s * 0.42, width: s * 0.68, height: s * 0.46,
          borderWidth: t, borderColor: c, borderTopWidth: 0, borderBottomLeftRadius: t * 1.5, borderBottomRightRadius: t * 1.5 }, 'b'),
        S({ position: 'absolute', left: s * 0.38, top: s * 0.58, width: s * 0.24, height: s * 0.3,
          borderWidth: t, borderColor: c, borderBottomWidth: 0 }, 'd'),
      ];
    case 'cloud':
    case 'cloudRain':
      return [
        ring('a', c, s * 0.4, t, { left: s * 0.1, top: s * 0.22 }),
        ring('b', c, s * 0.52, t, { left: s * 0.34, top: s * 0.1 }),
        bar('c', c, s * 0.62, t, { left: s * 0.19, top: s * 0.55 }),
        S({ position: 'absolute', left: s * 0.19, top: s * 0.52, width: s * 0.62, height: s * 0.14, backgroundColor: 'transparent' }, 'g'),
        ...(name === 'cloudRain'
          ? [bar('r1', c, t, s * 0.2, { left: s * 0.3, top: s * 0.72 }),
             bar('r2', c, t, s * 0.2, { left: s * 0.48, top: s * 0.78 }),
             bar('r3', c, t, s * 0.2, { left: s * 0.66, top: s * 0.72 })]
          : []),
      ];
    case 'chat':
      return [
        S({ position: 'absolute', left: s * 0.1, top: s * 0.14, width: s * 0.8, height: s * 0.6,
          borderWidth: t, borderColor: c, borderRadius: s * 0.22 }, 'b'),
        S({ position: 'absolute', left: s * 0.24, top: s * 0.66, width: s * 0.18, height: s * 0.18,
          borderWidth: t, borderColor: c, borderTopWidth: 0, borderRightWidth: 0,
          transform: [{ rotate: '-45deg' }] }, 't'),
      ];
    case 'history':
      return [
        ring('r', c, s * 0.86, t, { left: s * 0.07, top: s * 0.07 }),
        bar('h', c, t, s * 0.24, { left: mid - t / 2, top: s * 0.26 }),
        bar('m', c, s * 0.2, t, { left: mid - t / 2, top: mid - t / 2, transform: [{ translateX: s * 0.08 }] }),
      ];
    case 'camera':
      return [
        S({ position: 'absolute', left: s * 0.06, top: s * 0.26, width: s * 0.88, height: s * 0.58,
          borderWidth: t, borderColor: c, borderRadius: s * 0.16 }, 'b'),
        S({ position: 'absolute', left: s * 0.34, top: s * 0.12, width: s * 0.32, height: s * 0.16,
          borderWidth: t, borderColor: c, borderBottomWidth: 0, borderTopLeftRadius: t, borderTopRightRadius: t }, 'h'),
        ring('l', c, s * 0.32, t, { left: s * 0.34, top: s * 0.38 }),
      ];
    case 'gear':
      return [
        ring('o', c, s * 0.7, t, { left: s * 0.15, top: s * 0.15 }),
        ring('i', c, s * 0.26, t, { left: s * 0.37, top: s * 0.37 }),
        bar('t1', c, t, s * 0.16, { left: mid - t / 2, top: 0 }),
        bar('t2', c, t, s * 0.16, { left: mid - t / 2, top: s * 0.84 }),
        bar('t3', c, s * 0.16, t, { left: 0, top: mid - t / 2 }),
        bar('t4', c, s * 0.16, t, { left: s * 0.84, top: mid - t / 2 }),
      ];
    case 'chevronRight':
      return [chevron('c', c, s * 0.36, t, -45, { left: s * 0.28, top: s * 0.32 })];
    case 'chevronLeft':
      return [chevron('c', c, s * 0.36, t, 135, { left: s * 0.36, top: s * 0.32 })];
    case 'chevronDown':
      return [chevron('c', c, s * 0.36, t, 45, { left: s * 0.32, top: s * 0.28 })];
    case 'arrowLeft':
      return [
        chevron('c', c, s * 0.32, t, 135, { left: s * 0.14, top: mid - s * 0.16 }),
        bar('b', c, s * 0.62, t, { left: s * 0.2, top: mid - t / 2 }),
      ];
    case 'close':
      return [
        bar('a', c, s * 0.74, t, { left: s * 0.13, top: mid - t / 2, transform: [{ rotate: '45deg' }] }),
        bar('b', c, s * 0.74, t, { left: s * 0.13, top: mid - t / 2, transform: [{ rotate: '-45deg' }] }),
      ];
    case 'check':
      return [
        bar('a', c, s * 0.3, t, { left: s * 0.14, top: s * 0.56, transform: [{ rotate: '45deg' }] }),
        bar('b', c, s * 0.56, t, { left: s * 0.32, top: s * 0.48, transform: [{ rotate: '-50deg' }] }),
      ];
    case 'plus':
      return [
        bar('a', c, s * 0.66, t, { left: s * 0.17, top: mid - t / 2 }),
        bar('b', c, t, s * 0.66, { left: mid - t / 2, top: s * 0.17 }),
      ];
    case 'search':
      return [
        ring('r', c, s * 0.6, t, { left: s * 0.08, top: s * 0.08 }),
        bar('h', c, s * 0.3, t, { left: s * 0.6, top: s * 0.68, transform: [{ rotate: '45deg' }] }),
      ];
    case 'send':
      return [triangle('t', c, s * 0.72, s * 0.8, { left: s * 0.14, top: s * 0.1, transform: [{ rotate: '90deg' }] })];
    case 'sparkle':
      return [
        S({ position: 'absolute', left: s * 0.2, top: s * 0.2, width: s * 0.6, height: s * 0.6,
          backgroundColor: c, borderRadius: t, transform: [{ rotate: '45deg' }] }, 'a'),
        S({ position: 'absolute', left: s * 0.28, top: s * 0.28, width: s * 0.44, height: s * 0.44,
          backgroundColor: c, borderRadius: t }, 'b'),
      ];
    case 'warning':
      return [
        S({ position: 'absolute', left: s * 0.04, top: s * 0.12, width: s * 0.92, height: s * 0.76,
          borderWidth: t, borderColor: c, borderRadius: t * 1.2, transform: [{ rotate: '0deg' }],
          borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }, 'base'),
        S({ position: 'absolute', left: s * 0.16, top: s * 0.1, width: s * 0.62, height: s * 0.62,
          borderLeftWidth: t, borderTopWidth: t, borderColor: c, transform: [{ rotate: '45deg' }],
          borderTopLeftRadius: t }, 'v'),
        bar('l', c, t, s * 0.22, { left: mid - t / 2, top: s * 0.4 }),
        disc('d', c, t * 1.1, { left: mid - t * 0.55, top: s * 0.7 }),
      ];
    case 'info':
      return [
        ring('r', c, s * 0.86, t, { left: s * 0.07, top: s * 0.07 }),
        bar('l', c, t, s * 0.24, { left: mid - t / 2, top: s * 0.44 }),
        disc('d', c, t * 1.1, { left: mid - t * 0.55, top: s * 0.28 }),
      ];
    case 'refresh':
      return [
        S({ position: 'absolute', left: s * 0.1, top: s * 0.1, width: s * 0.8, height: s * 0.8,
          borderRadius: s * 0.4, borderWidth: t, borderColor: c, borderTopColor: 'transparent',
          transform: [{ rotate: '-40deg' }] }, 'r'),
        triangle('t', c, s * 0.3, s * 0.26, { left: s * 0.56, top: 0, transform: [{ rotate: '110deg' }] }),
      ];
    case 'trash':
      return [
        S({ position: 'absolute', left: s * 0.2, top: s * 0.26, width: s * 0.6, height: s * 0.62,
          borderWidth: t, borderColor: c, borderTopWidth: 0,
          borderBottomLeftRadius: t * 2, borderBottomRightRadius: t * 2 }, 'b'),
        bar('l', c, s * 0.8, t, { left: s * 0.1, top: s * 0.22 }),
        S({ position: 'absolute', left: s * 0.36, top: s * 0.08, width: s * 0.28, height: s * 0.14,
          borderWidth: t, borderColor: c, borderBottomWidth: 0 }, 'h'),
      ];
    case 'download':
      return [
        bar('l', c, t, s * 0.46, { left: mid - t / 2, top: s * 0.08 }),
        chevron('c', c, s * 0.28, t, 45, { left: s * 0.36, top: s * 0.36 }),
        S({ position: 'absolute', left: s * 0.14, top: s * 0.68, width: s * 0.72, height: s * 0.22,
          borderWidth: t, borderColor: c, borderTopWidth: 0,
          borderBottomLeftRadius: t * 1.6, borderBottomRightRadius: t * 1.6 }, 'b'),
      ];
    case 'pin':
      return [
        S({ position: 'absolute', left: s * 0.18, top: s * 0.06, width: s * 0.64, height: s * 0.64,
          borderWidth: t, borderColor: c, borderRadius: s * 0.32, borderBottomRightRadius: 0,
          transform: [{ rotate: '45deg' }] }, 'p'),
        ring('i', c, s * 0.24, t, { left: s * 0.38, top: s * 0.26 }),
      ];
    case 'droplet':
      return [
        S({ position: 'absolute', left: s * 0.2, top: s * 0.16, width: s * 0.6, height: s * 0.6,
          borderWidth: t, borderColor: c, borderRadius: s * 0.3, borderTopRightRadius: 0,
          transform: [{ rotate: '-45deg' }] }, 'd'),
      ];
    case 'mountain':
      // Solid, not hollowed with a background-coloured triangle: these icons
      // sit on surface, surfaceAlt and tinted cards alike, so nothing may
      // assume the colour behind it.
      return [triangle('a', c, s * 0.86, s * 0.68, { left: s * 0.07, top: s * 0.18 })];
    case 'sun': {
      // Each ray is a short bar inside a full-size rotated box, so it orbits
      // the centre instead of crossing it — no masking disc required.
      const rays = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
        <View
          key={`ray${deg}`}
          style={{ position: 'absolute', width: s, height: s, transform: [{ rotate: `${deg}deg` }] }}
        >
          <View
            style={{
              position: 'absolute',
              left: mid - t / 2,
              top: 0,
              width: t,
              height: s * 0.15,
              borderRadius: t / 2,
              backgroundColor: c,
            }}
          />
        </View>
      ));
      return [...rays, ring('r', c, s * 0.44, t, { left: s * 0.28, top: s * 0.28 })];
    }
    case 'leaf':
      return [
        S({ position: 'absolute', left: s * 0.16, top: s * 0.1, width: s * 0.68, height: s * 0.68,
          borderWidth: t, borderColor: c, borderRadius: s * 0.34,
          borderBottomLeftRadius: 0, transform: [{ rotate: '0deg' }] }, 'l'),
        bar('s', c, s * 0.5, t, { left: s * 0.06, top: s * 0.66, transform: [{ rotate: '-40deg' }] }),
      ];
    case 'thermometer':
      return [
        S({ position: 'absolute', left: s * 0.38, top: s * 0.06, width: s * 0.24, height: s * 0.56,
          borderWidth: t, borderColor: c, borderRadius: s * 0.12, borderBottomWidth: 0 }, 'b'),
        ring('r', c, s * 0.36, t, { left: s * 0.32, top: s * 0.56 }),
      ];
    case 'trendingDown':
      return [
        bar('a', c, s * 0.56, t, { left: s * 0.06, top: s * 0.38, transform: [{ rotate: '28deg' }] }),
        bar('b', c, s * 0.34, t, { left: s * 0.5, top: s * 0.6, transform: [{ rotate: '-32deg' }] }),
        bar('c', c, s * 0.26, t, { left: s * 0.66, top: s * 0.72 }),
        bar('d', c, t, s * 0.26, { left: s * 0.86, top: s * 0.5 }),
      ];
    case 'wifi':
    case 'wifiOff': {
      const arc = (k: string, d: number, top: number) =>
        S({ position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: t,
          borderColor: c, borderBottomColor: 'transparent', borderLeftColor: 'transparent',
          borderRightColor: 'transparent', left: (s - d) / 2, top }, k);
      return [
        arc('a1', s * 0.92, s * 0.06),
        arc('a2', s * 0.62, s * 0.24),
        arc('a3', s * 0.32, s * 0.42),
        disc('d', c, t * 1.2, { left: mid - t * 0.6, top: s * 0.76 }),
        ...(name === 'wifiOff'
          ? [bar('slash', c, s * 0.96, t, { left: s * 0.02, top: mid - t / 2, transform: [{ rotate: '45deg' }] })]
          : []),
      ];
    }
    case 'globe':
      return [
        ring('r', c, s * 0.86, t, { left: s * 0.07, top: s * 0.07 }),
        S({ position: 'absolute', left: s * 0.28, top: s * 0.07, width: s * 0.44, height: s * 0.86,
          borderWidth: t, borderColor: c, borderRadius: s * 0.22 }, 'e'),
        bar('h', c, s * 0.86, t, { left: s * 0.07, top: mid - t / 2 }),
      ];
    case 'shield':
      return [
        S({ position: 'absolute', left: s * 0.16, top: s * 0.08, width: s * 0.68, height: s * 0.8,
          borderWidth: t, borderColor: c, borderTopLeftRadius: t * 1.5, borderTopRightRadius: t * 1.5,
          borderBottomLeftRadius: s * 0.34, borderBottomRightRadius: s * 0.34 }, 's'),
      ];
    case 'package':
      return [
        S({ position: 'absolute', left: s * 0.12, top: s * 0.2, width: s * 0.76, height: s * 0.68,
          borderWidth: t, borderColor: c, borderRadius: t * 1.4 }, 'b'),
        bar('l', c, s * 0.76, t, { left: s * 0.12, top: s * 0.42 }),
        bar('v', c, t, s * 0.46, { left: mid - t / 2, top: s * 0.42 }),
      ];
    case 'file':
      return [
        S({ position: 'absolute', left: s * 0.18, top: s * 0.06, width: s * 0.64, height: s * 0.88,
          borderWidth: t, borderColor: c, borderRadius: t * 1.4 }, 'b'),
        bar('l1', c, s * 0.34, t, { left: s * 0.33, top: s * 0.4 }),
        bar('l2', c, s * 0.34, t, { left: s * 0.33, top: s * 0.58 }),
      ];
    case 'calendar':
      return [
        S({ position: 'absolute', left: s * 0.1, top: s * 0.16, width: s * 0.8, height: s * 0.76,
          borderWidth: t, borderColor: c, borderRadius: t * 1.4 }, 'b'),
        bar('h', c, s * 0.8, t, { left: s * 0.1, top: s * 0.38 }),
        bar('p1', c, t, s * 0.2, { left: s * 0.3, top: s * 0.04 }),
        bar('p2', c, t, s * 0.2, { left: s * 0.66, top: s * 0.04 }),
      ];
    case 'image':
      return [
        S({ position: 'absolute', left: s * 0.1, top: s * 0.14, width: s * 0.8, height: s * 0.72,
          borderWidth: t, borderColor: c, borderRadius: t * 1.6 }, 'b'),
        disc('s', c, s * 0.16, { left: s * 0.26, top: s * 0.3 }),
        triangle('m', c, s * 0.5, s * 0.3, { left: s * 0.34, top: s * 0.5 }),
      ];
    default:
      return [ring('r', c, s * 0.8, t, { left: s * 0.1, top: s * 0.1 })];
  }
}

export function Icon({ name, size = 22, color = COLORS.text }: IconProps) {
  return <View style={{ width: size, height: size }}>{draw(name, size, color)}</View>;
}
