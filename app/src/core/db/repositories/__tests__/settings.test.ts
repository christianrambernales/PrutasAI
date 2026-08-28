import { freshDb } from '../../testing/scanFixtures';
import {
  getSetting,
  setSetting,
  loadSettings,
  saveSetting,
  SETTING_KEYS,
} from '../settings';
import type { SavedLocation } from '../../../../state/appState';

describe('Settings Repository', () => {
  test('returns null for an unset setting', () => {
    const db = freshDb();
    expect(getSetting(db, 'app_language')).toBeNull();
    expect(getSetting(db, 'non_existent_key')).toBeNull();
  });

  test('sets and gets raw setting values', () => {
    const db = freshDb();
    setSetting(db, 'app_language', 'FIL');
    expect(getSetting(db, 'app_language')).toBe('FIL');

    setSetting(db, 'app_language', 'EN');
    expect(getSetting(db, 'app_language')).toBe('EN');
  });

  test('clears setting when value is null', () => {
    const db = freshDb();
    setSetting(db, 'app_language', 'FIL');
    expect(getSetting(db, 'app_language')).toBe('FIL');

    setSetting(db, 'app_language', null);
    expect(getSetting(db, 'app_language')).toBeNull();
  });

  test('loadSettings returns empty partial on fresh database', () => {
    const db = freshDb();
    const settings = loadSettings(db);
    expect(settings).toEqual({});
  });

  test('loadSettings correctly reads all persisted app state keys', () => {
    const db = freshDb();
    const location: SavedLocation = {
      label: 'Davao City',
      latitude: 7.1907,
      longitude: 125.4553,
    };

    setSetting(db, SETTING_KEYS.language, 'FIL');
    setSetting(db, SETTING_KEYS.savedLocation, JSON.stringify(location));
    setSetting(db, SETTING_KEYS.useLocation, 'true');
    setSetting(db, SETTING_KEYS.aiAssistant, 'true');

    const loaded = loadSettings(db);
    expect(loaded).toEqual({
      language: 'FIL',
      savedLocation: location,
      useLocation: true,
      aiAssistant: true,
    });
  });

  test('saveSetting writes through using key names and serializes objects/booleans', () => {
    const db = freshDb();
    const location: SavedLocation = {
      label: 'Baguio City',
      latitude: 16.4023,
      longitude: 120.596,
    };

    saveSetting(db, 'app_language', 'FIL');
    saveSetting(db, 'app_saved_location', location);
    saveSetting(db, 'app_use_location', false);
    saveSetting(db, 'app_ai_assistant', true);

    expect(getSetting(db, 'app_language')).toBe('FIL');
    expect(getSetting(db, 'app_saved_location')).toBe(JSON.stringify(location));
    expect(getSetting(db, 'app_use_location')).toBe('false');
    expect(getSetting(db, 'app_ai_assistant')).toBe('true');

    const loaded = loadSettings(db);
    expect(loaded).toEqual({
      language: 'FIL',
      savedLocation: location,
      useLocation: false,
      aiAssistant: true,
    });
  });

  test('saveSetting supports AppState property names as aliases', () => {
    const db = freshDb();
    const location: SavedLocation = {
      label: 'Cebu City',
      latitude: 10.3157,
      longitude: 123.8854,
    };

    saveSetting(db, 'language', 'EN');
    saveSetting(db, 'savedLocation', location);
    saveSetting(db, 'useLocation', true);
    saveSetting(db, 'aiAssistant', false);

    expect(getSetting(db, SETTING_KEYS.language)).toBe('EN');
    expect(getSetting(db, SETTING_KEYS.savedLocation)).toBe(JSON.stringify(location));
    expect(getSetting(db, SETTING_KEYS.useLocation)).toBe('true');
    expect(getSetting(db, SETTING_KEYS.aiAssistant)).toBe('false');
  });

  test('loadSettings handles corrupt JSON in savedLocation gracefully', () => {
    const db = freshDb();
    setSetting(db, SETTING_KEYS.savedLocation, '{not-valid-json');
    setSetting(db, SETTING_KEYS.language, 'EN');

    const loaded = loadSettings(db);
    expect(loaded.language).toBe('EN');
    expect(loaded.savedLocation).toBeUndefined();
  });
});
