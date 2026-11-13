import en from '../i18n/en.json';
import fil from '../i18n/fil.json';
import { strings } from '../i18n/strings';

describe('i18n dictionary key parity', () => {
  it('has identical keys in en and fil dictionaries', () => {
    const enKeys = Object.keys(en).sort();
    const filKeys = Object.keys(fil).sort();
    expect(enKeys).toEqual(filKeys);
  });

  it('includes all prototype v2 keys in en.json and fil.json', () => {
    const requiredPrototypeKeys = [
      'prototypeLocalOffline',
      'prototypeGreeting',
      'prototypeTagline',
      'prototypeTakeChoosePhoto',
      'prototypePhotoStorageBlurb',
      'prototypeCameraAction',
      'prototypeGalleryAction',
      'prototypeRecentActivity',
      'prototypeViewHistory',
      'prototypeCropProfiles',
      'prototypeEncyclopedia',
      'prototypeObservationPrompt',
      'prototypeObservationSub',
      'prototypeObsBetter',
      'prototypeObsSame',
      'prototypeObsWorse',
      'prototypeObsUnsure',
      'prototypeSaveObservation',
      'prototypeDemoTestButton',
      'prototypeIllustrativeNotice',
      'prototypeNoModelWeightsHeadline',
      'prototypeNoModelWeightsBlurb',
    ];

    for (const key of requiredPrototypeKeys) {
      expect(en).toHaveProperty(key);
      expect(fil).toHaveProperty(key);
      expect((en as Record<string, string>)[key]).toBeTruthy();
      expect((fil as Record<string, string>)[key]).toBeTruthy();
    }
  });

  it('includes all prototype v2 keys in strings.ts for both EN and FIL', () => {
    const enStrings = strings('EN');
    const filStrings = strings('FIL');

    const requiredPrototypeKeys = [
      'prototypeLocalOffline',
      'prototypeGreeting',
      'prototypeTagline',
      'prototypeTakeChoosePhoto',
      'prototypePhotoStorageBlurb',
      'prototypeCameraAction',
      'prototypeGalleryAction',
      'prototypeRecentActivity',
      'prototypeViewHistory',
      'prototypeCropProfiles',
      'prototypeEncyclopedia',
      'prototypeObservationPrompt',
      'prototypeObservationSub',
      'prototypeObsBetter',
      'prototypeObsSame',
      'prototypeObsWorse',
      'prototypeObsUnsure',
      'prototypeSaveObservation',
      'prototypeDemoTestButton',
      'prototypeIllustrativeNotice',
      'prototypeNoModelWeightsHeadline',
      'prototypeNoModelWeightsBlurb',
    ] as const;

    const enDict = enStrings as unknown as Record<string, unknown>;
    const filDict = filStrings as unknown as Record<string, unknown>;
    for (const key of requiredPrototypeKeys) {
      expect(enDict).toHaveProperty(key);
      expect(filDict).toHaveProperty(key);
      expect(enDict[key]).toBeTruthy();
      expect(filDict[key]).toBeTruthy();
    }
  });
});
