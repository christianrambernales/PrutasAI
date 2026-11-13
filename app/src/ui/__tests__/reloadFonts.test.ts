import { loadAsync, unloadAsync } from 'expo-font';
import { Platform } from 'react-native';
import { fontAssets } from '../fontAssets';
import { reloadLocalFonts } from '../reloadFonts';

jest.mock('expo-font', () => ({ loadAsync: jest.fn(), unloadAsync: jest.fn() }));

afterEach(() => jest.restoreAllMocks());

test('native retry loads local fonts without unloading faces or accessing document', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.clearAllMocks();
  (loadAsync as jest.Mock).mockResolvedValue(undefined);
  await reloadLocalFonts();
  expect(loadAsync).toHaveBeenCalledWith(fontAssets);
  expect(unloadAsync).not.toHaveBeenCalled();
});

test('web retry removes terminal failed faces before a fresh load and recovers after connectivity returns', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const families = Object.keys(fontAssets);
  const registrations = new Map(families.map(family => [family, 'error']));
  const events: string[] = [];
  let connected = false;
  (unloadAsync as jest.Mock).mockImplementation(async family => {
    events.push(`unload:${family}`);
    registrations.delete(family);
  });
  (loadAsync as jest.Mock).mockImplementation(async () => {
    events.push('load');
    // Mirrors Expo's existing-registration short circuit. A terminal error
    // stays an error unless unload removed the old face first.
    for (const family of families) {
      if (!registrations.has(family)) registrations.set(family, connected ? 'loaded' : 'error');
    }
  });
  const verify = jest.fn(async (query: string) => {
    const family = query.match(/"([^"]+)"/)![1];
    events.push(`verify:${family}`);
    if (registrations.get(family) === 'error') throw new Error('terminal face rejection');
    return registrations.has(family) ? [{ status: 'loaded' }] : [];
  });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { fonts: { load: verify } } });
  try {
    await expect(reloadLocalFonts()).rejects.toThrow('terminal face rejection');
    connected = true;
    events.length = 0;
    await expect(reloadLocalFonts()).resolves.toBeUndefined();
    expect(events.slice(0, families.length)).toEqual(families.map(family => `unload:${family}`));
    expect(events[families.length]).toBe('load');
    expect(events.slice(families.length + 1)).toEqual(families.map(family => `verify:${family}`));
    expect([...registrations.values()]).toEqual(families.map(() => 'loaded'));
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

test('web recovery removes quoted owned rules in descending order and preserves unrelated font faces', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const families = Object.keys(fontAssets);
  const normalize = (value: string) => value.replace(/["']/g, '');
  const rules = [
    { type: 5, style: { fontFamily: 'UnrelatedFont' } },
    ...families.map(family => ({ type: 5, style: { fontFamily: `"${family}"` } })),
    { type: 1, style: { fontFamily: 'PlusJakartaSans-Regular' } },
  ];
  const faces = new Map([
    ['UnrelatedFont', { family: 'UnrelatedFont', status: 'loaded' }],
    ...families.map(family => [family, { family: `"${family}"`, status: 'error' }] as const),
  ]);
  const deletions: number[] = [];
  const sheet = { cssRules: rules, deleteRule: (index: number) => { deletions.push(index); rules.splice(index, 1); } };
  // Mirrors the installed matcher: quoted serialization does not match the
  // alias passed to unload, leaving the failed CSS face behind.
  (unloadAsync as jest.Mock).mockImplementation(async family => {
    const index = rules.findIndex(rule => rule.type === 5 && rule.style.fontFamily === family);
    if (index >= 0) rules.splice(index, 1);
  });
  (loadAsync as jest.Mock).mockImplementation(async () => {
    for (const family of families) {
      if (!rules.some(rule => rule.type === 5 && normalize(rule.style.fontFamily) === family)) {
        rules.push({ type: 5, style: { fontFamily: `"${family}"` } });
        faces.set(family, { family: `"${family}"`, status: 'loaded' });
      }
    }
  });
  const browserFonts = {
    forEach: (callback: (face: { family: string; status: string }) => void) => faces.forEach(callback),
    delete: (face: { family: string }) => faces.delete(normalize(face.family)),
    load: jest.fn(async (query: string) => {
      const face = faces.get(query.match(/"([^"]+)"/)![1]);
      if (face?.status === 'error') throw new Error('terminal quoted face failure');
      return face ? [face] : [];
    }),
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { fonts: browserFonts, getElementById: () => ({ sheet }) } });
  try {
    await expect(reloadLocalFonts()).resolves.toBeUndefined();
    expect(deletions).toEqual([5, 4, 3, 2, 1]);
    expect(rules[0].style.fontFamily).toBe('UnrelatedFont');
    expect(rules[1].type).toBe(1);
    expect(faces.get('UnrelatedFont')).toEqual({ family: 'UnrelatedFont', status: 'loaded' });
    expect(families.every(family => faces.get(family)?.status === 'loaded')).toBe(true);
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
