import { DEFAULT_PRESET_ID, findPreset } from './themes/presets.js';

export const DEFAULT_SETTINGS = {
  enabled: true,
  activeTheme: { chatgpt: DEFAULT_PRESET_ID, claude: DEFAULT_PRESET_ID, 'claude-code': DEFAULT_PRESET_ID },
  perSite: false,
  customThemes: [],
};

export function resolveSeeds(settings, site) {
  const key = settings.perSite ? site : 'claude';
  const id = settings.activeTheme?.[key] || settings.activeTheme?.claude || DEFAULT_PRESET_ID;
  const custom = (settings.customThemes || []).find((t) => t.id === id);
  if (custom) return { id, name: custom.name, seeds: custom.seeds };
  const preset = findPreset(id) || findPreset(DEFAULT_PRESET_ID);
  return { id: preset.id, name: preset.name, seeds: preset.seeds };
}

export function withDefaults(raw) {
  return {
    ...DEFAULT_SETTINGS,
    ...(raw || {}),
    activeTheme: { ...DEFAULT_SETTINGS.activeTheme, ...((raw && raw.activeTheme) || {}) },
    customThemes: Array.isArray(raw?.customThemes) ? raw.customThemes : [],
  };
}

export function loadSettings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(null, (raw) => resolve(withDefaults(raw)));
    } catch (e) {
      resolve(withDefaults(null));
    }
  });
}

export function saveSettings(patch) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (raw) => {
      const next = withDefaults({ ...withDefaults(raw), ...patch });
      chrome.storage.sync.set(next, () => resolve(next));
    });
  });
}

export function onSettingsChanged(cb) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') loadSettings().then(cb);
  });
}

export function newCustomId() {
  return 'custom-' + Math.random().toString(36).slice(2, 8);
}
