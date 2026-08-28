import type { SqlDriver } from '../driver';
import type { AppState, Language, SavedLocation } from '../../../state/appState';

export const SETTING_KEYS = {
  language: 'app_language',
  savedLocation: 'app_saved_location',
  useLocation: 'app_use_location',
  aiAssistant: 'app_ai_assistant',
} as const;

const KEY_ALIAS_MAP: Record<string, string> = {
  language: SETTING_KEYS.language,
  savedLocation: SETTING_KEYS.savedLocation,
  useLocation: SETTING_KEYS.useLocation,
  aiAssistant: SETTING_KEYS.aiAssistant,
};

function resolveKey(key: string): string {
  return KEY_ALIAS_MAP[key] ?? key;
}

/**
 * Reads a raw setting string value from the SQLite setting table.
 * Returns null if the key is not set or its value is null.
 */
export function getSetting(driver: SqlDriver, key: string): string | null {
  const dbKey = resolveKey(key);
  const row = driver.get<{ value: string | null }>(
    'SELECT value FROM setting WHERE key = ?',
    [dbKey],
  );
  return row?.value ?? null;
}

/**
 * Writes or removes a raw setting string in the SQLite setting table.
 * Passing null removes the key from the table.
 */
export function setSetting(driver: SqlDriver, key: string, value: string | null): void {
  const dbKey = resolveKey(key);
  if (value === null) {
    driver.all('DELETE FROM setting WHERE key = ? RETURNING key', [dbKey]);
  } else {
    driver.all(
      'INSERT OR REPLACE INTO setting (key, value) VALUES (?, ?) RETURNING key',
      [dbKey, value],
    );
  }
}

/**
 * Loads persisted app preferences from SQLite and maps them into a Partial<AppState>.
 * Unset or corrupted values are omitted, allowing the caller to fall back to initial state defaults.
 */
export function loadSettings(driver: SqlDriver): Partial<AppState> {
  const settings: Partial<AppState> = {};

  const lang = getSetting(driver, SETTING_KEYS.language);
  if (lang === 'EN' || lang === 'FIL') {
    settings.language = lang as Language;
  }

  const loc = getSetting(driver, SETTING_KEYS.savedLocation);
  if (loc) {
    try {
      const parsed = JSON.parse(loc);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.label === 'string' &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number'
      ) {
        settings.savedLocation = {
          label: parsed.label,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
        };
      }
    } catch {
      // Ignore corrupt JSON
    }
  }

  const useLoc = getSetting(driver, SETTING_KEYS.useLocation);
  if (useLoc !== null) {
    settings.useLocation = useLoc === 'true';
  }

  const aiAssistant = getSetting(driver, SETTING_KEYS.aiAssistant);
  if (aiAssistant !== null) {
    settings.aiAssistant = aiAssistant === 'true';
  }

  return settings;
}

/**
 * Saves a setting with automatic serialization for booleans, numbers, and objects.
 * Supports both SQLite key names ('app_language', etc.) and AppState property names ('language', etc.).
 */
export function saveSetting(driver: SqlDriver, key: string, value: unknown): void {
  const dbKey = resolveKey(key);
  if (value === null || value === undefined) {
    setSetting(driver, dbKey, null);
  } else if (typeof value === 'string') {
    setSetting(driver, dbKey, value);
  } else if (typeof value === 'boolean' || typeof value === 'number') {
    setSetting(driver, dbKey, String(value));
  } else if (typeof value === 'object') {
    setSetting(driver, dbKey, JSON.stringify(value));
  }
}
