/** Versioned checkpoint saves and settings. Denied or corrupt storage never prevents play. */
export const SAVE_KEY = 'tarnished-tune-4r-save-v1',
  SETTINGS_KEY = 'tarnished-tune-4r-settings-v1';
export const DEFAULT_SETTINGS = {
  volume: 0.65,
  music: 0.5,
  quality: 'auto',
  reducedMotion: false,
  assist: false,
  invertY: false,
};
export function safeRead(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function validSave(s) {
  return !!(
    s &&
    s.version === 1 &&
    Number.isInteger(s.level) &&
    s.level >= 0 &&
    s.level <= 8 &&
    Number.isFinite(s.echoes) &&
    s.echoes >= 0 &&
    Array.isArray(s.collected) &&
    Array.isArray(s.verses) &&
    Array.isArray(s.weapons)
  );
}
export function createStorage(storage) {
  let error = '';
  return {
    get error() {
      return error;
    },
    load() {
      const s = safeRead(storage, SAVE_KEY);
      return validSave(s) ? s : null;
    },
    save(data) {
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
      } catch {
        error = 'Progress could not be saved on this device. This journey remains playable.';
        return false;
      }
    },
    settings() {
      const s = safeRead(storage, SETTINGS_KEY) || {};
      return {
        ...DEFAULT_SETTINGS,
        ...Object.fromEntries(
          Object.entries(s).filter(
            ([k, v]) => k in DEFAULT_SETTINGS && typeof v === typeof DEFAULT_SETTINGS[k],
          ),
        ),
      };
    },
    setSettings(settings) {
      try {
        storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        error = 'Settings are temporary on this device.';
      }
    },
    clear() {
      try {
        storage.removeItem(SAVE_KEY);
      } catch {}
    },
  };
}
