import { DEFAULT_PRESET_ID, findPreset } from './themes/presets.js';

export const SITES = ['chatgpt', 'claude'];
export const LANGS = ['auto', 'ko', 'en'];

export const DEFAULT_SETTINGS = {
  enabled: true,
  activeTheme: { chatgpt: DEFAULT_PRESET_ID, claude: DEFAULT_PRESET_ID },
  customThemes: [],
  lang: 'auto',
  lastSite: 'claude',
};

// 2026-10-14 Notion 시리즈를 Mood로 개명하기 전에 저장된 id
const LEGACY_IDS = {
  'notion-blue-light': 'mood-daybreak', 'notion-green-light': 'mood-meadow', 'notion-purple-light': 'mood-lavender',
  'notion-pink-light': 'mood-romance', 'notion-yellow-light': 'mood-honey', 'notion-brown-light': 'mood-cocoa',
  'notion-blue-dark': 'mood-midnight', 'notion-green-dark': 'mood-moss', 'notion-purple-dark': 'mood-twilight', 'notion-red-dark': 'mood-ember',
};
const migrateId = (id) => LEGACY_IDS[id] || id;

// Claude Code 웹(claude.ai/code)은 Claude 테마를 따른다
export function siteKey(site) {
  return site === 'chatgpt' ? 'chatgpt' : 'claude';
}

export function otherSite(site) {
  return siteKey(site) === 'chatgpt' ? 'claude' : 'chatgpt';
}

export function resolveSeeds(settings, site) {
  const id = settings.activeTheme?.[siteKey(site)] || DEFAULT_PRESET_ID;
  const custom = (settings.customThemes || []).find((t) => t.id === id);
  if (custom) return { id, name: custom.name, seeds: custom.seeds, custom: true };
  const preset = findPreset(id) || findPreset(DEFAULT_PRESET_ID);
  return { id: preset.id, name: preset.name, seeds: preset.seeds, custom: false };
}

const HEX = /^#[0-9a-f]{6}$/i;
// 시드가 hex가 아닌 커스텀 테마는 버린다 (CSS로 그대로 나가는 값이라 저장소가 깨져도 주입되지 않게)
const validTheme = (c) => c && typeof c.id === 'string' && typeof c.name === 'string' && c.seeds && HEX.test(c.seeds.bg) && HEX.test(c.seeds.accent) && (c.seeds.sidebar === undefined || HEX.test(c.seeds.sidebar));

export function withDefaults(raw) {
  raw = raw || {};
  const at = { ...(raw.activeTheme || {}) };
  // 옛 저장값: 사이트별 스위치(perSite)가 꺼져 있었으면 공통 테마(claude 키)를 양쪽에 둔다
  if (raw.perSite === false && at.claude) at.chatgpt = at.claude;
  return {
    enabled: raw.enabled === undefined ? true : !!raw.enabled,
    activeTheme: { chatgpt: migrateId(at.chatgpt) || DEFAULT_PRESET_ID, claude: migrateId(at.claude) || DEFAULT_PRESET_ID },
    customThemes: Array.isArray(raw.customThemes) ? raw.customThemes.filter(validTheme) : [],
    lang: LANGS.includes(raw.lang) ? raw.lang : 'auto',
    lastSite: SITES.includes(raw.lastSite) ? raw.lastSite : 'claude',
  };
}

// migrate: 옛 키가 남아 있으면 이행 결과를 저장하고 옛 키를 지운다 (안 지우면 매번 다시 이행된다).
// 쓰기는 팝업만 한다 — 모든 탭·프레임의 콘텐츠 스크립트가 동시에 쓰면 sync 쓰기 한도를 태운다.
export function loadSettings({ migrate = false } = {}) {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(null, (raw) => {
        const s = withDefaults(raw);
        if (migrate && raw && 'perSite' in raw) {
          chrome.storage.sync.remove('perSite', () => chrome.storage.sync.set(s, () => {
            if (chrome.runtime.lastError) console.warn('[ilook] migration write failed', chrome.runtime.lastError.message);
            resolve(s);
          }));
        } else resolve(s);
      });
    } catch (e) {
      resolve(withDefaults(null));
    }
  });
}

// 쓰기가 실패하면(용량·쓰기 한도) reject한다. 조용히 넘어가면 화면엔 저장된 것처럼 보이다 사라진다.
export function saveSettings(patch) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, (raw) => {
      const next = withDefaults({ ...withDefaults(raw), ...patch });
      chrome.storage.sync.set(next, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(next);
      });
    });
  });
}

// 팝업만 쓰는 값(lastSite, lang)이 바뀐 것은 탭에 알릴 필요가 없다
const POPUP_ONLY_KEYS = new Set(['lastSite', 'lang']);

export function onSettingsChanged(cb) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (Object.keys(changes).every((k) => POPUP_ONLY_KEYS.has(k))) return;
    loadSettings().then(cb);
  });
}

// storage.sync는 항목 하나에 8KB까지다. 이름이 한글 24자면 테마 하나가 약 170바이트라 40개면 여유가 있다.
export const MAX_CUSTOM_THEMES = 40;

export function newCustomId() {
  return 'custom-' + Math.random().toString(36).slice(2, 8);
}
