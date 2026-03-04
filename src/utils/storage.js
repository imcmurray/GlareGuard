const STORAGE_KEY = 'glareguard-settings';

const VALID_MODES = ['simpleDim', 'reduceGlare', 'darkInvert', 'nightWarm'];

const DEFAULTS = { intensity: 50, mode: 'simpleDim', auto: false, autoDetect: false, detectThreshold: 50 };

/** Map old mode names to new ones for seamless migration. */
const MIGRATION_MAP = {
  globalDim: 'simpleDim',
  selectiveBright: 'reduceGlare',
  nightTint: 'nightWarm',
};

/**
 * Save settings to localStorage.
 * @param {{ intensity: number, mode: string, auto: boolean }} settings
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * Load settings from localStorage, falling back to defaults.
 * Migrates old mode names automatically.
 * @returns {{ intensity: number, mode: string, auto: boolean }}
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);

    // Migrate old mode names
    let mode = parsed.mode;
    if (MIGRATION_MAP[mode]) {
      mode = MIGRATION_MAP[mode];
    }

    return {
      intensity: typeof parsed.intensity === 'number' ? parsed.intensity : DEFAULTS.intensity,
      mode: VALID_MODES.includes(mode) ? mode : DEFAULTS.mode,
      auto: typeof parsed.auto === 'boolean' ? parsed.auto : DEFAULTS.auto,
      autoDetect: typeof parsed.autoDetect === 'boolean' ? parsed.autoDetect : DEFAULTS.autoDetect,
      detectThreshold: typeof parsed.detectThreshold === 'number'
        ? Math.max(10, Math.min(200, parsed.detectThreshold))
        : DEFAULTS.detectThreshold,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Clear saved settings from localStorage.
 */
export function clearSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}
