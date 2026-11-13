import { loadAsync, unloadAsync } from 'expo-font';
import { Platform } from 'react-native';
import { fontAssets } from './fontAssets';

const families = Object.keys(fontAssets);
const ownedFamily = (value: string) => families.includes(value.trim().replace(/^(['"])(.*)\1$/, '$2'));

/** Verify initial and retried web loads independently from Expo's CSS cache. */
export async function verifyLocalFonts(): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (!document.fonts?.load) throw new Error('Font readiness verification unavailable');
  const results = await Promise.all(families.map(family =>
    document.fonts.load(`16px "${family}"`, 'PrutasAI mga prutas'),
  ));
  if (results.some(faces => faces.length === 0)) throw new Error('Local font face did not load');
}

/** Recover a failed local-font load without remounting the application. */
export async function reloadLocalFonts(): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // Firefox can serialize fontFamily with quotes, which Expo's exact-name
    // matcher misses. Touch only our aliases in Expo's own generated sheet.
    const element = typeof document.getElementById === 'function'
      ? document.getElementById('expo-generated-fonts') as HTMLStyleElement | null : null;
    const sheet = element?.sheet;
    if (sheet) {
      for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
        const rule = sheet.cssRules[index];
        if (rule.type === 5 && ownedFamily((rule as CSSFontFaceRule).style.fontFamily)) sheet.deleteRule(index);
      }
    }
    // Terminal error faces retain their rejected load promise. Removing only
    // owned faces allows the fresh CSS rules to create genuine new loads.
    if (typeof document.fonts?.forEach === 'function') {
      const owned: FontFace[] = [];
      document.fonts.forEach(face => { if (ownedFamily(face.family)) owned.push(face); });
      const removeFace = (document.fonts as FontFaceSet & { delete?: (face: FontFace) => boolean }).delete;
      if (typeof removeFace === 'function') {
        for (const face of owned) removeFace.call(document.fonts, face);
      }
    }
    // Public unloading also purges Expo's successful-load cache. CSS cleanup
    // comes first so duplicate rules cannot shift Expo's captured rule indices.
    for (const family of families) await unloadAsync(family);
  }
  await loadAsync(fontAssets);
  await verifyLocalFonts();
}
