# 팝업 재설계 · 사이트별 테마 · 언어 전환 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팝업을 "사이트 탭 + 현재 상태 + 목록 / 편집 / 설정" 세 화면으로 다시 만들고, 테마를 사이트별로 저장하며, 팝업 언어(자동/한국어/English)를 앱 안에서 바꿀 수 있게 한다.

**Architecture:** 엔진 안내 문구를 코드로 바꾸고(번역 가능), 저장 구조를 항상-사이트별로 단순화(옛 값 자동 이행)한 뒤, 팝업을 `i18n.js`(문자열) / `views.js`(DOM 렌더) / `popup.js`(상태·이벤트·저장)로 나눠 새 마크업·스타일 위에 올린다. 콘텐츠 스크립트는 `resolveSeeds` 내부만 바뀐다.

**Tech Stack:** 순수 ES 모듈, esbuild 번들(`npm run build`), `node --test`(`npm test`), Chrome MV3. 설계 문서: `docs/superpowers/specs/2026-10-11-popup-redesign-design.md`.

**작업 규칙:** 커밋 작성자는 저장소 설정(아엔) 그대로. 커밋 메시지에 Co-Authored-By 줄을 넣지 않는다. 모든 명령은 `I-Look2/`에서 실행한다.

---

## 파일 구조

| 파일 | 책임 |
| --- | --- |
| `src/engine/derive.js` (수정) | `notes`를 한국어 문장 대신 코드(`bg-adjusted` 등)로 |
| `src/storage.js` (수정) | 사이트별 저장 구조, 옛 값 이행, `siteKey`, `lang`, `lastSite` |
| `src/_locales/en/messages.json`, `ko/messages.json` (수정) | 팝업 문자열 전부 |
| `src/popup/i18n.js` (신규) | `pickLang`, `load`, `t`, `apply`, `setDict` |
| `src/popup/views.js` (신규) | `miniHtml`, `paintChrome`, `renderHeader`, `renderNow`, `renderGrid`, `renderEditor`, `renderSettings` — DOM만 만든다 |
| `src/popup/popup.html` (교체) | 세 화면 마크업, 문자열은 `data-i18n` |
| `src/popup/popup.css` (교체) | 고정 상단·하단 + 스크롤 가운데 |
| `src/popup/popup.js` (교체) | 상태, 이벤트, 저장, 탭 메시지 |
| `src/manifest.json` (수정) | `default_locale: en` |
| `test/engine.test.mjs` (수정), `test/storage.test.mjs` (신규), `test/i18n.test.mjs` (신규) | 검증 |

---

### Task 1: 엔진 안내 문구를 코드로

**Files:**
- Modify: `src/engine/derive.js:51-63`, `src/engine/derive.js:144-166`
- Test: `test/engine.test.mjs:91-99`

- [ ] **Step 1: 테스트를 코드 기준으로 바꾼다**

`test/engine.test.mjs`의 두 테스트를 아래로 교체:

```js
test('중간 회색은 보정 안내가 뜬다', () => {
  const { notes } = derive({ bg: '#767676', accent: '#2e7cd1' });
  assert.ok(notes.includes('bg-adjusted'));
});

test('포인트=배경이면 포인트색 보정 안내가 뜬다', () => {
  const { notes } = derive({ bg: '#e9f3f7', accent: '#e9f3f7' });
  assert.ok(notes.includes('accent-adjusted'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"`
Expected: `not ok` 2개 (중간 회색, 포인트=배경), `# fail 2`

- [ ] **Step 3: derive.js의 notes.push 네 곳을 코드로**

`normalizeBackground`:
```js
    notes.push('bg-adjusted');
  }
  if (lch.C > 0.2) notes.push('bg-saturated');
```
`derive`:
```js
    accent = ensureContrast(accent, bg, 3);
    notes.push('accent-adjusted');
```
```js
    if (Math.abs(hexToOklch(accent).L - hexToOklch(seeds.accent).L) > 0.04) notes.push('accent-text-adjusted');
```

- [ ] **Step 4: 통과 확인**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# pass 59`, `# fail 0`

- [ ] **Step 5: 커밋**

```bash
git add src/engine/derive.js test/engine.test.mjs
git commit -m "색 엔진: 안내 문구를 번역 가능한 코드로 (bg-adjusted 등)"
```

---

### Task 2: 저장 구조 — 항상 사이트별, 옛 값 이행

**Files:**
- Modify: `src/storage.js` (전체 교체)
- Test: `test/storage.test.mjs` (신규)

- [ ] **Step 1: 실패하는 테스트 작성**

`test/storage.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withDefaults, resolveSeeds, siteKey, DEFAULT_SETTINGS } from '../src/storage.js';

test('siteKey: claude-code는 claude를 따른다', () => {
  assert.equal(siteKey('chatgpt'), 'chatgpt');
  assert.equal(siteKey('claude'), 'claude');
  assert.equal(siteKey('claude-code'), 'claude');
});

test('기본값', () => {
  const s = withDefaults(null);
  assert.deepEqual(s.activeTheme, { chatgpt: 'notion-blue-light', claude: 'notion-blue-light' });
  assert.equal(s.lang, 'auto');
  assert.equal(s.lastSite, 'claude');
  assert.equal(s.enabled, true);
  assert.ok(!('perSite' in s));
});

test('옛 저장값: perSite=false였으면 공통 테마를 양쪽에 복사한다', () => {
  const s = withDefaults({ perSite: false, activeTheme: { chatgpt: 'notion-blue-light', claude: 'dracula', 'claude-code': 'dracula' } });
  assert.deepEqual(s.activeTheme, { chatgpt: 'dracula', claude: 'dracula' });
});

test('옛 저장값: perSite=true였으면 사이트별 값을 유지한다', () => {
  const s = withDefaults({ perSite: true, activeTheme: { chatgpt: 'nord-light', claude: 'dracula', 'claude-code': 'x' } });
  assert.deepEqual(s.activeTheme, { chatgpt: 'nord-light', claude: 'dracula' });
});

test('잘못된 lang·lastSite는 기본값으로', () => {
  const s = withDefaults({ lang: 'fr', lastSite: 'bing' });
  assert.equal(s.lang, 'auto');
  assert.equal(s.lastSite, 'claude');
});

test('resolveSeeds: 사이트별 테마, 커스텀 우선', () => {
  const s = withDefaults({ activeTheme: { chatgpt: 'custom-1', claude: 'dracula' }, customThemes: [{ id: 'custom-1', name: '내 것', seeds: { bg: '#111111', accent: '#ff00aa' } }] });
  const gpt = resolveSeeds(s, 'chatgpt');
  assert.equal(gpt.id, 'custom-1');
  assert.equal(gpt.custom, true);
  assert.equal(gpt.seeds.bg, '#111111');
  const cl = resolveSeeds(s, 'claude-code');
  assert.equal(cl.id, 'dracula');
  assert.equal(cl.custom, false);
});

test('resolveSeeds: 없는 id는 기본 프리셋', () => {
  const s = withDefaults({ activeTheme: { chatgpt: 'gone', claude: 'gone' } });
  assert.equal(resolveSeeds(s, 'chatgpt').id, DEFAULT_SETTINGS.activeTheme.chatgpt);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test test/storage.test.mjs 2>&1 | grep -E "^# (pass|fail)|SyntaxError"`
Expected: `SyntaxError: ... does not provide an export named 'siteKey'` (또는 fail > 0)

- [ ] **Step 3: storage.js 전체 교체**

```js
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

// Claude Code 웹(claude.ai/code)은 Claude 테마를 따른다
export function siteKey(site) {
  return site === 'chatgpt' ? 'chatgpt' : 'claude';
}

export function resolveSeeds(settings, site) {
  const id = settings.activeTheme?.[siteKey(site)] || DEFAULT_PRESET_ID;
  const custom = (settings.customThemes || []).find((t) => t.id === id);
  if (custom) return { id, name: custom.name, seeds: custom.seeds, custom: true };
  const preset = findPreset(id) || findPreset(DEFAULT_PRESET_ID);
  return { id: preset.id, name: preset.name, seeds: preset.seeds, custom: false };
}

export function withDefaults(raw) {
  raw = raw || {};
  const at = { ...(raw.activeTheme || {}) };
  // 옛 저장값: 사이트별 스위치(perSite)가 꺼져 있었으면 공통 테마(claude 키)를 양쪽에 둔다
  if (raw.perSite === false && at.claude) at.chatgpt = at.claude;
  return {
    enabled: raw.enabled === undefined ? true : !!raw.enabled,
    activeTheme: { chatgpt: at.chatgpt || DEFAULT_PRESET_ID, claude: at.claude || DEFAULT_PRESET_ID },
    customThemes: Array.isArray(raw.customThemes) ? raw.customThemes : [],
    lang: LANGS.includes(raw.lang) ? raw.lang : 'auto',
    lastSite: SITES.includes(raw.lastSite) ? raw.lastSite : 'claude',
  };
}

export function loadSettings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(null, (raw) => {
        const s = withDefaults(raw);
        // 옛 키가 남아 있으면 이행 결과를 저장하고 옛 키를 지운다 (안 지우면 매번 다시 이행된다)
        if (raw && 'perSite' in raw) chrome.storage.sync.remove('perSite', () => chrome.storage.sync.set(s, () => resolve(s)));
        else resolve(s);
      });
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
```

- [ ] **Step 4: 통과 확인 (엔진·apply 테스트 포함)**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"`
Expected: `# pass 66`, `# fail 0`

- [ ] **Step 5: 콘텐츠 스크립트가 여전히 동작하는지 빌드로 확인**

Run: `npm run build 2>&1 | tail -1 && grep -c "siteKey" dist/extension/content.js`
Expected: `빌드 완료 → dist/extension`, 숫자 ≥ 1

- [ ] **Step 6: 커밋**

```bash
git add src/storage.js test/storage.test.mjs
git commit -m "저장 구조: 항상 사이트별 테마, perSite·claude-code 키 제거와 자동 이행, lang·lastSite 추가"
```

---

### Task 3: 문자열 사전과 i18n 모듈

**Files:**
- Modify: `src/_locales/en/messages.json`, `src/_locales/ko/messages.json`
- Create: `src/popup/i18n.js`
- Test: `test/i18n.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/i18n.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickLang, t, setDict } from '../src/popup/i18n.js';

const en = JSON.parse(readFileSync(new URL('../src/_locales/en/messages.json', import.meta.url), 'utf8'));
const ko = JSON.parse(readFileSync(new URL('../src/_locales/ko/messages.json', import.meta.url), 'utf8'));

test('ko·en 키 집합이 같다', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ko).sort());
});

test('키 이름은 영문·숫자·밑줄만 (chrome.i18n 규칙)', () => {
  for (const k of Object.keys(en)) assert.match(k, /^[A-Za-z0-9_]+$/);
});

test('popup.html의 data-i18n 키가 전부 사전에 있다', () => {
  const html = readFileSync(new URL('../src/popup/popup.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-title|-placeholder)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 10, 'data-i18n 속성이 너무 적다');
  for (const k of keys) assert.ok(en[k], `사전에 없는 키: ${k}`);
});

test('엔진 안내 코드마다 번역이 있다', () => {
  for (const c of ['bg-adjusted', 'bg-saturated', 'accent-adjusted', 'accent-text-adjusted']) {
    assert.ok(en['popup_note_' + c.replace(/-/g, '_')], c);
  }
});

test('pickLang', () => {
  assert.equal(pickLang('ko', 'en-US'), 'ko');
  assert.equal(pickLang('en', 'ko-KR'), 'en');
  assert.equal(pickLang('auto', 'ko-KR'), 'ko');
  assert.equal(pickLang('auto', 'ja'), 'en');
  assert.equal(pickLang('auto', undefined), 'en');
});

test('t: 자리표시자 치환, 없는 키는 키 그대로', () => {
  setDict({ hello: { message: '{site}에 적용 중' } });
  assert.equal(t('hello', { site: 'Claude' }), 'Claude에 적용 중');
  assert.equal(t('hello'), '{site}에 적용 중');
  assert.equal(t('nope'), 'nope');
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test test/i18n.test.mjs 2>&1 | grep -E "Cannot find module|^# fail"`
Expected: `Cannot find module .../src/popup/i18n.js`

- [ ] **Step 3: i18n.js 작성**

`src/popup/i18n.js`:

```js
// 팝업 문자열. chrome.i18n.getMessage는 브라우저 언어에 고정되므로 쓰지 않고 messages.json을 직접 읽는다.
let dict = {};

export function pickLang(setting, uiLang) {
  if (setting === 'ko' || setting === 'en') return setting;
  return String(uiLang || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export async function load(lang) {
  const res = await fetch(chrome.runtime.getURL(`_locales/${lang}/messages.json`));
  dict = await res.json();
  return dict;
}

export function setDict(d) {
  dict = d;
}

export function t(key, subs = {}) {
  const m = dict[key]?.message;
  if (m === undefined) return key;
  return m.replace(/\{(\w+)\}/g, (_, k) => (k in subs ? subs[k] : `{${k}}`));
}

export function apply(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
}
```

- [ ] **Step 4: en/messages.json 전체 교체**

```json
{
  "appName": { "message": "I Look" },
  "appDesc": { "message": "Recolor ChatGPT and Claude the way you like." },

  "popup_enabled_title": { "message": "On / Off" },
  "popup_settings_title": { "message": "Settings" },
  "popup_now_applied": { "message": "Applied to {site}" },
  "popup_now_off": { "message": "Turned off" },
  "popup_change_colors": { "message": "Change colors" },
  "popup_filter_all": { "message": "All" },
  "popup_filter_light": { "message": "Light" },
  "popup_filter_dark": { "message": "Dark" },
  "popup_filter_mine": { "message": "Mine" },
  "popup_mine": { "message": "Mine" },
  "popup_mine_empty": { "message": "No themes of your own yet. Press + to make one." },
  "popup_hint_apply": { "message": "Tap a theme to apply it to {site}" },
  "popup_new_theme": { "message": "+ New theme" },
  "popup_edit": { "message": "Edit" },

  "popup_back": { "message": "‹ Back" },
  "popup_editor_title": { "message": "Change colors" },
  "popup_theme_name_placeholder": { "message": "Theme name" },
  "popup_default_theme_name": { "message": "My theme" },
  "popup_variant_suffix": { "message": "{name} variant" },
  "popup_seed_bg": { "message": "Background" },
  "popup_seed_accent": { "message": "Accent" },
  "popup_seed_sidebar": { "message": "Sidebar" },
  "popup_sidebar_auto": { "message": "Derive from background" },
  "popup_editor_hint": { "message": "Text, borders and code backgrounds are derived from these three colors." },
  "popup_random": { "message": "🎲 Random" },
  "popup_delete": { "message": "Delete" },
  "popup_save": { "message": "Save" },
  "popup_preview_hint": { "message": "Changes show live in open {site} tabs" },

  "popup_settings": { "message": "Settings" },
  "popup_lang": { "message": "Language" },
  "popup_lang_auto": { "message": "Auto" },
  "popup_same_theme": { "message": "Use the same theme on both sites" },
  "popup_same_theme_sub": { "message": "Apply {site}'s {theme} to {other} too" },
  "popup_apply": { "message": "Apply" },
  "popup_applied_done": { "message": "Applied" },
  "popup_sources": { "message": "Color sources" },
  "popup_sources_sub": { "message": "Notion · Radix · Catppuccin · Nord · Rosé Pine · Dracula" },

  "popup_note_bg_adjusted": { "message": "Background lightness adjusted so text stays readable" },
  "popup_note_bg_saturated": { "message": "Highly saturated backgrounds can tire your eyes" },
  "popup_note_accent_adjusted": { "message": "Accent lightness adjusted to stand out from the background" },
  "popup_note_accent_text_adjusted": { "message": "Accent lightness adjusted so button text stays readable" }
}
```

- [ ] **Step 5: ko/messages.json 전체 교체**

```json
{
  "appName": { "message": "I Look" },
  "appDesc": { "message": "ChatGPT·Claude 화면을 내 색으로." },

  "popup_enabled_title": { "message": "켜기 / 끄기" },
  "popup_settings_title": { "message": "설정" },
  "popup_now_applied": { "message": "{site}에 적용 중" },
  "popup_now_off": { "message": "꺼져 있음" },
  "popup_change_colors": { "message": "색 바꾸기" },
  "popup_filter_all": { "message": "전체" },
  "popup_filter_light": { "message": "라이트" },
  "popup_filter_dark": { "message": "다크" },
  "popup_filter_mine": { "message": "내 테마" },
  "popup_mine": { "message": "내 테마" },
  "popup_mine_empty": { "message": "아직 내 테마가 없어요. +를 눌러 만들어 보세요." },
  "popup_hint_apply": { "message": "누르면 {site}에 바로 적용돼요" },
  "popup_new_theme": { "message": "+ 내 테마 만들기" },
  "popup_edit": { "message": "편집" },

  "popup_back": { "message": "‹ 목록" },
  "popup_editor_title": { "message": "색 바꾸기" },
  "popup_theme_name_placeholder": { "message": "테마 이름" },
  "popup_default_theme_name": { "message": "내 테마" },
  "popup_variant_suffix": { "message": "{name} 변형" },
  "popup_seed_bg": { "message": "배경" },
  "popup_seed_accent": { "message": "포인트" },
  "popup_seed_sidebar": { "message": "사이드바" },
  "popup_sidebar_auto": { "message": "배경에서 자동으로" },
  "popup_editor_hint": { "message": "글자색·선·코드 배경은 이 세 색에서 자동으로 맞춰요." },
  "popup_random": { "message": "🎲 랜덤" },
  "popup_delete": { "message": "삭제" },
  "popup_save": { "message": "저장" },
  "popup_preview_hint": { "message": "바꾸는 동안 열린 {site} 탭에 바로 보여요" },

  "popup_settings": { "message": "설정" },
  "popup_lang": { "message": "언어" },
  "popup_lang_auto": { "message": "자동" },
  "popup_same_theme": { "message": "두 사이트 같은 테마 쓰기" },
  "popup_same_theme_sub": { "message": "지금 {site}의 {theme}를 {other}에도" },
  "popup_apply": { "message": "적용" },
  "popup_applied_done": { "message": "적용했어요" },
  "popup_sources": { "message": "색상 출처" },
  "popup_sources_sub": { "message": "Notion · Radix · Catppuccin · Nord · Rosé Pine · Dracula" },

  "popup_note_bg_adjusted": { "message": "글자가 잘 보이도록 배경 밝기를 조정했어요" },
  "popup_note_bg_saturated": { "message": "채도가 높은 배경은 오래 보면 눈이 피로할 수 있어요" },
  "popup_note_accent_adjusted": { "message": "포인트색이 배경과 비슷해 밝기를 조정했어요" },
  "popup_note_accent_text_adjusted": { "message": "버튼 글자가 잘 보이도록 포인트색 밝기를 조정했어요" }
}
```

- [ ] **Step 6: 테스트 — popup.html 검사만 아직 실패해야 정상**

Run: `node --test test/i18n.test.mjs 2>&1 | grep -E "^# (pass|fail)|^not ok"`
Expected: `not ok` 1개(`popup.html의 data-i18n 키…`, 아직 옛 마크업이라 속성이 없음), 나머지 pass. Task 4에서 통과시킨다.

- [ ] **Step 7: 커밋**

```bash
git add src/popup/i18n.js src/_locales test/i18n.test.mjs
git commit -m "팝업 i18n: messages.json 직접 로드, ko·en 문자열 사전"
```

---

### Task 4: 새 팝업 마크업과 스타일

**Files:**
- Replace: `src/popup/popup.html`, `src/popup/popup.css`

- [ ] **Step 1: popup.html 전체 교체**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>I Look</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <header class="top">
    <img class="logo" src="icons/48.png" alt="" width="22" height="22" />
    <div class="tabs" role="tablist">
      <button type="button" class="tab" data-site="claude" role="tab">Claude</button>
      <button type="button" class="tab" data-site="chatgpt" role="tab">ChatGPT</button>
    </div>
    <label class="switch" data-i18n-title="popup_enabled_title">
      <input type="checkbox" id="enabled" />
      <span class="track"><span class="knob"></span></span>
    </label>
    <button type="button" class="icon" id="open-settings" data-i18n-title="popup_settings_title" aria-label="Settings">⚙</button>
  </header>

  <section id="view-list" class="view">
    <div class="now">
      <div class="now-mini" id="now-mini"></div>
      <div class="now-text">
        <b id="now-name"></b>
        <small id="now-sub"></small>
      </div>
      <button type="button" class="btn" id="change-colors" data-i18n="popup_change_colors"></button>
    </div>
    <div class="chips" role="tablist">
      <button type="button" class="chip is-on" data-filter="all" data-i18n="popup_filter_all"></button>
      <button type="button" class="chip" data-filter="light" data-i18n="popup_filter_light"></button>
      <button type="button" class="chip" data-filter="dark" data-i18n="popup_filter_dark"></button>
      <button type="button" class="chip" data-filter="mine" data-i18n="popup_filter_mine"></button>
    </div>
    <div class="scroll">
      <div class="grid" id="grid"></div>
      <p class="empty" id="mine-empty" hidden data-i18n="popup_mine_empty"></p>
    </div>
    <footer class="foot">
      <span id="foot-hint"></span>
      <button type="button" class="btn primary" id="new-theme" data-i18n="popup_new_theme"></button>
    </footer>
  </section>

  <section id="view-edit" class="view" hidden>
    <div class="subhead">
      <button type="button" class="btn ghost" id="back-edit" data-i18n="popup_back"></button>
      <h2 data-i18n="popup_editor_title"></h2>
    </div>
    <div class="scroll pad">
      <input id="theme-name" class="name" maxlength="24" data-i18n-placeholder="popup_theme_name_placeholder" />
      <div id="edit-preview"></div>
      <div class="seeds">
        <label class="seed">
          <span data-i18n="popup_seed_bg"></span>
          <input type="color" id="seed-bg" />
          <input type="text" id="seed-bg-hex" class="hex" maxlength="7" spellcheck="false" />
        </label>
        <label class="seed">
          <span data-i18n="popup_seed_accent"></span>
          <input type="color" id="seed-accent" />
          <input type="text" id="seed-accent-hex" class="hex" maxlength="7" spellcheck="false" />
        </label>
        <label class="seed">
          <span data-i18n="popup_seed_sidebar"></span>
          <input type="color" id="seed-sidebar" />
          <input type="text" id="seed-sidebar-hex" class="hex" maxlength="7" spellcheck="false" />
        </label>
        <label class="auto"><input type="checkbox" id="sidebar-auto" /> <span data-i18n="popup_sidebar_auto"></span></label>
      </div>
      <p class="hint" data-i18n="popup_editor_hint"></p>
      <ul class="notes" id="notes"></ul>
      <div class="actions">
        <button type="button" class="btn ghost" id="dice" data-i18n="popup_random"></button>
        <span class="spacer"></span>
        <button type="button" class="btn ghost danger" id="delete-custom" hidden data-i18n="popup_delete"></button>
        <button type="button" class="btn primary" id="save-custom" data-i18n="popup_save"></button>
      </div>
    </div>
    <footer class="foot"><span id="preview-hint"></span></footer>
  </section>

  <section id="view-settings" class="view" hidden>
    <div class="subhead">
      <button type="button" class="btn ghost" id="back-settings" data-i18n="popup_back"></button>
      <h2 data-i18n="popup_settings"></h2>
    </div>
    <div class="scroll pad">
      <div class="item">
        <div><span data-i18n="popup_lang"></span><small>Language</small></div>
        <div class="seg" role="radiogroup">
          <button type="button" data-lang="auto" data-i18n="popup_lang_auto"></button>
          <button type="button" data-lang="ko">한국어</button>
          <button type="button" data-lang="en">English</button>
        </div>
      </div>
      <div class="item">
        <div><span data-i18n="popup_same_theme"></span><small id="same-theme-sub"></small></div>
        <button type="button" class="btn" id="same-theme-apply" data-i18n="popup_apply"></button>
      </div>
      <a class="item link" href="#" id="sources">
        <div><span data-i18n="popup_sources"></span><small data-i18n="popup_sources_sub"></small></div>
        <span>›</span>
      </a>
      <p class="version" id="version"></p>
    </div>
  </section>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: popup.css 전체 교체**

```css
:root {
  --bg: #e9f3f7;
  --surface: #d9e0e3;
  --elevated: #d9dbdb;
  --hover: #dbe5e9;
  --active: #cfd8dc;
  --text: #202223;
  --text-2: #525657;
  --muted: #7a7f82;
  --border: #cbd4d7;
  --border-strong: #a8b0b3;
  --accent: #3a84af;
  --on-accent: #ffffff;
  --accent-soft: #c5dbe8;
  --danger: #ca3334;
  --shadow: rgba(0, 0, 0, 0.12);
  color-scheme: light;
}

* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  width: 360px;
  height: 560px;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font: 13px/1.45 "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", "Malgun Gothic", system-ui, sans-serif;
  transition: background-color 160ms ease, color 160ms ease;
}
button, input { font: inherit; color: inherit; }
button { cursor: pointer; border: 0; background: none; padding: 0; }
button:focus-visible, input:focus-visible, a:focus-visible, .switch input:focus-visible + .track { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
[hidden] { display: none !important; }

/* 상단 고정 */
.top { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--surface); border-bottom: 1px solid var(--border); flex: none; }
.logo { border-radius: 6px; }
.tabs { display: flex; background: var(--active); border-radius: 8px; padding: 2px; }
.tab { padding: 4px 10px; border-radius: 6px; color: var(--text-2); }
.tab.is-on { background: var(--bg); color: var(--text); font-weight: 600; box-shadow: 0 1px 2px var(--shadow); }
.switch { position: relative; display: inline-block; width: 36px; height: 20px; margin-left: auto; flex: none; }
.switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.track { position: absolute; inset: 0; border-radius: 10px; background: var(--border-strong); transition: background 160ms; }
.knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px var(--shadow); transition: transform 160ms; }
.switch input:checked + .track { background: var(--accent); }
.switch input:checked + .track .knob { transform: translateX(16px); }
.icon { width: 26px; height: 26px; border-radius: 6px; color: var(--text-2); font-size: 15px; display: grid; place-items: center; flex: none; }
.icon:hover { background: var(--hover); color: var(--text); }

/* 화면 공통: 가운데만 스크롤 */
.view { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.scroll { flex: 1; min-height: 0; overflow-y: auto; }
.scroll.pad { padding: 10px 12px; }
.foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--border); background: var(--surface); font-size: 12px; color: var(--text-2); flex: none; }
.subhead { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--border); flex: none; }
.subhead h2 { margin: 0; font-size: 14px; font-weight: 600; }

/* 버튼 */
.btn { padding: 6px 10px; border-radius: 7px; border: 1px solid var(--border-strong); background: var(--bg); font-weight: 600; font-size: 12px; white-space: nowrap; }
.btn:hover { background: var(--hover); }
.btn.primary { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
.btn.primary:hover { filter: brightness(0.95); }
.btn.ghost { border-color: transparent; color: var(--text-2); background: none; }
.btn.ghost:hover { background: var(--hover); color: var(--text); }
.btn.danger { color: var(--danger); }

/* 목록: 현재 상태 줄 */
.now { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--border); flex: none; }
.now-mini { width: 48px; height: 34px; border-radius: 7px; overflow: hidden; border: 1px solid var(--border); flex: none; }
.now-mini .mini { height: 100%; font-size: 4px; }
.now-text { flex: 1; min-width: 0; }
.now-text b { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.now-text small { color: var(--muted); }

.chips { display: flex; gap: 6px; padding: 8px 12px 4px; flex: none; }
.chip { padding: 3px 9px; border-radius: 999px; color: var(--text-2); font-size: 12px; }
.chip:hover { background: var(--hover); }
.chip.is-on { background: var(--text); color: var(--bg); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 6px 12px 12px; }
.card { text-align: left; border-radius: 9px; overflow: hidden; border: 2px solid transparent; background: var(--surface); transition: border-color 120ms, transform 120ms; }
.card:hover { transform: translateY(-1px); }
.card.is-active { border-color: var(--accent); }
.card .label { display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 5px 8px 6px; font-size: 11px; }
.card .label span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card .label small { color: var(--muted); font-size: 10px; flex: none; }
.card .label .edit { color: var(--accent); font-size: 11px; flex: none; padding: 1px 4px; border-radius: 4px; }
.card .label .edit:hover { background: var(--hover); }
.empty { margin: 8px 12px; color: var(--muted); font-size: 12px; }

/* 미니 미리보기 (목록 카드·현재 줄·편집) */
.mini { position: relative; display: grid; grid-template-columns: 30% 1fr; height: 56px; background: var(--m-bg); color: var(--m-text); font-size: 7px; overflow: hidden; }
.mini.big { height: 130px; border-radius: 9px; font-size: 10px; margin: 10px 0 12px; border: 1px solid var(--border); }
.mini .m-side { background: var(--m-sidebar); padding: 6px 5px; display: flex; flex-direction: column; gap: 3px; }
.mini .m-side i { display: block; height: 5px; border-radius: 2px; background: var(--m-side-text); opacity: 0.35; }
.mini .m-side i.on { background: var(--m-side-active); opacity: 1; }
.mini .m-main { padding: 6px 7px; display: flex; flex-direction: column; gap: 4px; }
.mini .m-user { align-self: flex-end; width: 55%; height: 8px; border-radius: 4px; background: var(--m-user); }
.mini .m-line { height: 4px; border-radius: 2px; background: var(--m-text); opacity: 0.8; }
.mini .m-line.short { width: 60%; opacity: 0.45; }
.mini .m-code { height: 9px; border-radius: 3px; background: var(--m-code); }
.mini .m-input { margin-top: auto; height: 10px; border-radius: 5px; background: var(--m-surface); border: 1px solid var(--m-border); position: relative; }
.mini .m-input::after { content: ''; position: absolute; right: 2px; top: 2px; width: 10px; height: 5px; border-radius: 3px; background: var(--m-accent); }
.mini.big .m-side i { height: 8px; }
.mini.big .m-user { height: 16px; }
.mini.big .m-line { height: 6px; }
.mini.big .m-code { height: 18px; }
.mini.big .m-input { height: 20px; }
.mini.big .m-input::after { width: 22px; height: 12px; top: 3px; right: 3px; }

/* 편집 */
.name { width: 100%; padding: 7px 9px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface); }
.seeds { display: flex; flex-direction: column; gap: 8px; }
.seed { display: grid; grid-template-columns: 64px 36px 1fr; align-items: center; gap: 8px; }
.seed > span { color: var(--text-2); }
.seed input[type='color'] { width: 36px; height: 28px; padding: 0; border: 1px solid var(--border); border-radius: 6px; background: none; cursor: pointer; }
.seed input[type='color']::-webkit-color-swatch-wrapper { padding: 2px; }
.seed input[type='color']::-webkit-color-swatch { border: 0; border-radius: 4px; }
.seed input:disabled { opacity: 0.5; cursor: default; }
.hex { padding: 5px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; }
.auto { display: flex; align-items: center; gap: 6px; margin-left: 72px; font-size: 12px; color: var(--text-2); }
.auto input { accent-color: var(--accent); margin: 0; }
.hint { margin: 10px 0 0; font-size: 12px; color: var(--text-2); }
.notes { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.notes li { font-size: 12px; color: var(--text-2); padding: 6px 9px; border-radius: 6px; background: var(--accent-soft); }
.actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.spacer { flex: 1; }

/* 설정 */
.item { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--border); color: inherit; text-decoration: none; }
.item > div { min-width: 0; }
.item small { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
.item.link:hover { background: var(--hover); margin: 0 -12px; padding-left: 12px; padding-right: 12px; }
.seg { display: flex; background: var(--active); border-radius: 7px; padding: 2px; font-size: 12px; flex: none; }
.seg button { padding: 3px 8px; border-radius: 5px; color: var(--text-2); }
.seg button.is-on { background: var(--bg); color: var(--text); font-weight: 600; }
.version { color: var(--muted); font-size: 11px; margin: 12px 0 0; }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
```

- [ ] **Step 3: i18n 테스트가 전부 통과하는지 확인**

Run: `node --test test/i18n.test.mjs 2>&1 | grep -E "^# (pass|fail)|^not ok"`
Expected: `# pass 6`, `# fail 0`

- [ ] **Step 4: 커밋**

```bash
git add src/popup/popup.html src/popup/popup.css
git commit -m "팝업: 사이트 탭·현재 상태·목록 / 편집 / 설정 세 화면 마크업과 스타일"
```

---

### Task 5: views.js — DOM 렌더

**Files:**
- Create: `src/popup/views.js`

- [ ] **Step 1: views.js 작성**

```js
// 팝업 DOM 렌더. 저장·메시지는 popup.js가 한다.
import { derive } from '../engine/derive.js';
import { PRESETS } from '../themes/presets.js';

const $ = (sel) => document.querySelector(sel);
export const SITE_NAME = { chatgpt: 'ChatGPT', claude: 'Claude' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function miniHtml(seeds, cls = 'mini') {
  const t = derive(seeds).tokens;
  const vars = [
    ['m-bg', 'bg-app'], ['m-sidebar', 'bg-sidebar'], ['m-side-text', 'sidebar-text'], ['m-side-active', 'sidebar-active'],
    ['m-text', 'text-primary'], ['m-user', 'bg-user-msg'], ['m-code', 'bg-code'], ['m-surface', 'bg-surface'], ['m-border', 'border-subtle'], ['m-accent', 'accent'],
  ].map(([v, k]) => `--${v}:${t[k]}`).join(';');
  return `<div class="${cls}" style="${vars}">
    <div class="m-side"><i class="on"></i><i></i><i></i><i></i></div>
    <div class="m-main"><div class="m-user"></div><div class="m-line"></div><div class="m-line short"></div><div class="m-code"></div><div class="m-input"></div></div>
  </div>`;
}

// 팝업 자체 색을 적용 중인 테마로
export function paintChrome(seeds) {
  const r = derive(seeds);
  const s = document.documentElement.style;
  const map = {
    '--bg': 'bg-app', '--surface': 'bg-surface', '--elevated': 'bg-elevated', '--hover': 'bg-hover', '--active': 'bg-active',
    '--text': 'text-primary', '--text-2': 'text-secondary', '--muted': 'text-muted', '--border': 'border-subtle', '--border-strong': 'border-strong',
    '--accent': 'accent', '--on-accent': 'text-on-accent', '--accent-soft': 'accent-soft', '--danger': 'danger', '--shadow': 'shadow',
  };
  for (const [v, k] of Object.entries(map)) s.setProperty(v, r.tokens[k]);
  s.setProperty('color-scheme', r.isLight ? 'light' : 'dark');
}

export function renderHeader(site, enabled) {
  document.querySelectorAll('.tab').forEach((b) => {
    const on = b.dataset.site === site;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $('#enabled').checked = enabled;
}

export function renderNow(current, site, enabled, t) {
  $('#now-mini').innerHTML = miniHtml(current.seeds);
  $('#now-name').textContent = current.name;
  $('#now-sub').textContent = enabled ? t('popup_now_applied', { site: SITE_NAME[site] }) : t('popup_now_off');
  $('#foot-hint').textContent = t('popup_hint_apply', { site: SITE_NAME[site] });
}

function card(theme, activeId, t) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'card' + (theme.id === activeId ? ' is-active' : '');
  b.dataset.id = theme.id;
  b.setAttribute('aria-pressed', theme.id === activeId ? 'true' : 'false');
  const right = theme.custom
    ? `<span class="edit" data-edit="${esc(theme.id)}">${esc(t('popup_edit'))}</span>`
    : `<small>${esc(theme.series || '')}</small>`;
  b.innerHTML = `${miniHtml(theme.seeds)}<div class="label"><span>${esc(theme.name)}</span>${right}</div>`;
  return b;
}

export function renderGrid(settings, filter, activeId, t) {
  const grid = $('#grid');
  grid.innerHTML = '';
  const customs = settings.customThemes || [];
  const items = filter === 'mine'
    ? customs.map((c) => ({ ...c, custom: true }))
    : PRESETS.filter((p) => filter === 'all' || p.mode === filter);
  for (const th of items) grid.appendChild(card(th, activeId, t));
  $('#mine-empty').hidden = !(filter === 'mine' && customs.length === 0);
}

export function renderChips(filter) {
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-on', c.dataset.filter === filter));
}

export function renderEditor(editing, t) {
  const s = editing.seeds;
  const result = derive(s);
  const auto = !s.sidebar;
  $('#theme-name').value = editing.name;
  $('#delete-custom').hidden = editing.isNew;
  $('#seed-bg').value = s.bg;
  $('#seed-bg-hex').value = s.bg;
  $('#seed-accent').value = s.accent;
  $('#seed-accent-hex').value = s.accent;
  $('#seed-sidebar').value = s.sidebar || result.tokens['bg-sidebar'];
  $('#seed-sidebar-hex').value = s.sidebar || result.tokens['bg-sidebar'];
  $('#seed-sidebar').disabled = auto;
  $('#seed-sidebar-hex').disabled = auto;
  $('#sidebar-auto').checked = auto;
  $('#edit-preview').innerHTML = miniHtml(s, 'mini big');
  $('#notes').innerHTML = result.notes.map((c) => `<li>${esc(t('popup_note_' + c.replace(/-/g, '_')))}</li>`).join('');
  paintChrome(s);
}

export function renderSettings(settings, site, current, t) {
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('is-on', b.dataset.lang === settings.lang));
  const other = site === 'chatgpt' ? 'claude' : 'chatgpt';
  $('#same-theme-sub').textContent = t('popup_same_theme_sub', { site: SITE_NAME[site], theme: current.name, other: SITE_NAME[other] });
  $('#same-theme-apply').textContent = t('popup_apply');
  $('#version').textContent = 'I Look ' + chrome.runtime.getManifest().version;
}
```

- [ ] **Step 2: 문법 확인**

Run: `node --check src/popup/views.js && echo ok`
Expected: `ok`

- [ ] **Step 3: 커밋**

```bash
git add src/popup/views.js
git commit -m "팝업: views.js — 목록·편집·설정 DOM 렌더 분리"
```

---

### Task 6: popup.js — 상태·이벤트·저장

**Files:**
- Replace: `src/popup/popup.js`

- [ ] **Step 1: popup.js 전체 교체**

```js
import { oklchToHex } from '../engine/color.js';
import { PRESETS } from '../themes/presets.js';
import { loadSettings, saveSettings, resolveSeeds, newCustomId, siteKey } from '../storage.js';
import * as i18n from './i18n.js';
import { renderHeader, renderNow, renderGrid, renderChips, renderEditor, renderSettings, paintChrome, SITE_NAME } from './views.js';

const $ = (sel) => document.querySelector(sel);
const t = i18n.t;

let settings = null;
let site = 'claude';
let filter = 'all';
let editing = null;
let previewTimer = null;

const current = () => resolveSeeds(settings, site);
const otherSite = () => (site === 'chatgpt' ? 'claude' : 'chatgpt');

function show(view) {
  for (const v of ['list', 'edit', 'settings']) $(`#view-${v}`).hidden = v !== view;
}

function renderList() {
  const cur = current();
  renderHeader(site, settings.enabled);
  renderNow(cur, site, settings.enabled, t);
  renderChips(filter);
  renderGrid(settings, filter, cur.id, t);
  paintChrome(cur.seeds);
}

async function applyLang() {
  const lang = i18n.pickLang(settings.lang, chrome.i18n.getUILanguage());
  await i18n.load(lang);
  document.documentElement.lang = lang;
  i18n.apply(document);
}

async function activate(id) {
  settings = await saveSettings({ activeTheme: { ...settings.activeTheme, [siteKey(site)]: id }, enabled: true });
  renderList();
}

async function switchSite(next) {
  site = next;
  settings = await saveSettings({ lastSite: site });
  renderList();
}

/* 편집 */
function openEditor(theme, isNew) {
  editing = { id: isNew ? newCustomId() : theme.id, name: theme.name, seeds: { ...theme.seeds }, isNew };
  renderEditor(editing, t);
  $('#preview-hint').textContent = t('popup_preview_hint', { site: SITE_NAME[site] });
  show('edit');
  $('#theme-name').focus();
  schedulePreview();
}

function changeColors() {
  const cur = current();
  if (cur.custom) openEditor(settings.customThemes.find((c) => c.id === cur.id), false);
  else openEditor({ name: t('popup_variant_suffix', { name: cur.name }), seeds: cur.seeds }, true);
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => sendToTabs({ type: 'ilook:preview', seeds: editing.seeds }), 60);
}

async function sendToTabs(msg) {
  try {
    const tabs = await chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://claude.ai/*'] });
    await Promise.all(tabs.map((tab) => chrome.tabs.sendMessage(tab.id, msg).catch(() => {})));
  } catch (e) {}
}

function setSeed(key, hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  editing.seeds[key] = hex.toLowerCase();
  renderEditor(editing, t);
  schedulePreview();
}

function randomSeeds() {
  const dark = Math.random() < 0.5;
  const H = Math.random() * 360;
  const bg = oklchToHex({ L: dark ? 0.2 + Math.random() * 0.08 : 0.94 + Math.random() * 0.04, C: 0.01 + Math.random() * 0.03, H });
  const offsets = [0, 60, 180, 210];
  const accH = (H + offsets[Math.floor(Math.random() * offsets.length)] + (Math.random() * 20 - 10) + 360) % 360;
  const accent = oklchToHex({ L: dark ? 0.72 : 0.55, C: 0.12 + Math.random() * 0.06, H: accH });
  return { bg, accent };
}

async function saveCustom() {
  const name = $('#theme-name').value.trim() || t('popup_default_theme_name');
  const list = (settings.customThemes || []).filter((x) => x.id !== editing.id);
  list.push({ id: editing.id, name, seeds: editing.seeds });
  settings = await saveSettings({ customThemes: list });
  await sendToTabs({ type: 'ilook:preview-end' });
  await activate(editing.id);
  show('list');
}

async function deleteCustom() {
  const list = (settings.customThemes || []).filter((x) => x.id !== editing.id);
  const activeTheme = { ...settings.activeTheme };
  for (const k of Object.keys(activeTheme)) if (activeTheme[k] === editing.id) activeTheme[k] = PRESETS[0].id;
  settings = await saveSettings({ customThemes: list, activeTheme });
  await sendToTabs({ type: 'ilook:preview-end' });
  renderList();
  show('list');
}

async function backToList() {
  await sendToTabs({ type: 'ilook:preview-end' });
  renderList();
  show('list');
}

/* 설정 */
function openSettings() {
  renderSettings(settings, site, current(), t);
  show('settings');
}

async function setLang(lang) {
  settings = await saveSettings({ lang });
  await applyLang();
  renderSettings(settings, site, current(), t);
}

async function copyToOther() {
  const activeTheme = { ...settings.activeTheme, [otherSite()]: settings.activeTheme[siteKey(site)] };
  settings = await saveSettings({ activeTheme });
  $('#same-theme-apply').textContent = t('popup_applied_done');
}

async function detectSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const u = new URL(tab?.url || '');
    if (u.hostname.endsWith('chatgpt.com')) return 'chatgpt';
    if (u.hostname.endsWith('claude.ai')) return 'claude';
  } catch (e) {}
  return settings.lastSite;
}

function bind() {
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchSite(b.dataset.site)));
  $('#enabled').addEventListener('change', async (e) => {
    settings = await saveSettings({ enabled: e.target.checked });
    renderList();
  });
  $('#open-settings').addEventListener('click', openSettings);
  $('#change-colors').addEventListener('click', changeColors);
  document.querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => {
      filter = c.dataset.filter;
      renderList();
    })
  );
  $('#grid').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      e.stopPropagation();
      openEditor(settings.customThemes.find((c) => c.id === edit.dataset.edit), false);
      return;
    }
    const b = e.target.closest('.card');
    if (b) activate(b.dataset.id);
  });
  $('#new-theme').addEventListener('click', () => openEditor({ name: t('popup_default_theme_name'), seeds: { ...current().seeds } }, true));

  $('#back-edit').addEventListener('click', backToList);
  for (const key of ['bg', 'accent', 'sidebar']) {
    $(`#seed-${key}`).addEventListener('input', (e) => setSeed(key, e.target.value));
    $(`#seed-${key}-hex`).addEventListener('change', (e) => setSeed(key, e.target.value.trim()));
  }
  $('#sidebar-auto').addEventListener('change', (e) => {
    if (e.target.checked) delete editing.seeds.sidebar;
    else editing.seeds.sidebar = $('#seed-sidebar').value;
    renderEditor(editing, t);
    schedulePreview();
  });
  $('#dice').addEventListener('click', () => {
    editing.seeds = randomSeeds();
    renderEditor(editing, t);
    schedulePreview();
  });
  $('#save-custom').addEventListener('click', saveCustom);
  $('#delete-custom').addEventListener('click', deleteCustom);

  $('#back-settings').addEventListener('click', () => {
    renderList();
    show('list');
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $('#same-theme-apply').addEventListener('click', copyToOther);
  $('#sources').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
  });
}

async function main() {
  settings = await loadSettings();
  site = await detectSite();
  await applyLang();
  bind();
  renderList();
}

main();
```

- [ ] **Step 2: manifest 기본 언어를 영어로**

`src/manifest.json`의 `"default_locale": "ko"` → `"default_locale": "en"`.

- [ ] **Step 3: 테스트·빌드**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)" && npm run build 2>&1 | tail -1 && grep -c "popup_now_applied" dist/extension/popup.js`
Expected: `# pass 72` `# fail 0`, `빌드 완료 → dist/extension`, `1` 이상

- [ ] **Step 4: 디버그 크롬에서 확장 재로드 후 팝업을 열어 본다**

디버그 크롬(`~/ilook-chrome`, 9222)이 떠 있어야 한다. 스크래치패드의 `reload-ext.mjs`로 확장을 재로드한 뒤, 아래 스크립트로 세 화면 × 두 언어를 캡처한다.

`popup-verify.mjs` (스크래치패드 `pw/`에 저장):

```js
import { chromium } from 'playwright-core';
const b = await chromium.connectOverCDP('http://localhost:9222');
const pop = await b.contexts()[0].newPage();
await pop.setViewportSize({ width: 360, height: 560 });
const url = 'chrome-extension://popndmafjicdijhfbkpnliobiogchomh/popup.html';
const errors = [];
pop.on('pageerror', (e) => errors.push(e.message));
pop.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
for (const lang of ['ko', 'en']) {
  await pop.goto(url); await pop.waitForTimeout(800);
  await pop.click('#open-settings'); await pop.click(`[data-lang="${lang}"]`); await pop.waitForTimeout(300);
  await pop.screenshot({ path: `${process.env.S}/popup-${lang}-settings.png` });
  await pop.click('#back-settings'); await pop.waitForTimeout(200);
  await pop.screenshot({ path: `${process.env.S}/popup-${lang}-list.png` });
  await pop.click('#change-colors'); await pop.waitForTimeout(300);
  await pop.screenshot({ path: `${process.env.S}/popup-${lang}-edit.png` });
  await pop.click('#back-edit');
}
console.log(JSON.stringify({ errors, nowSub: await pop.textContent('#now-sub'), tabs: await pop.$$eval('.tab', (els) => els.map((e) => e.className)) }));
await pop.close(); await b.close();
```

Run: `cd <scratchpad>/pw && node reload-ext.mjs && S=<scratchpad> node popup-verify.mjs`
Expected: `errors: []`, `nowSub`가 "Applied to Claude"(마지막이 en), 탭 하나에 `is-on`. 6장의 PNG를 Read로 열어 세 화면이 설계 목업과 같은지 눈으로 확인.

- [ ] **Step 5: 동작 확인 (수동, 디버그 크롬 팝업에서)**

1. Claude 탭에서 팝업 열기 → `Claude` 탭이 선택돼 있고 "Notion Blue · Claude에 적용 중".
2. 다른 카드 클릭 → Claude 탭 화면이 즉시 바뀌고, `ChatGPT` 탭으로 넘기면 ChatGPT의 테마는 그대로.
3. 색 바꾸기 → "○○ 변형" 편집, 색 바꾸면 열린 Claude 탭에 실시간 반영, 저장 → 내 테마 칩에 나타나고 적용됨.
4. 설정 → English → 전부 영어. "Use the same theme on both sites" 적용 → ChatGPT 탭도 같은 테마.
5. 설정 → 자동 → 브라우저 언어(ko)면 한국어.

- [ ] **Step 6: 커밋**

```bash
git add src/popup/popup.js src/manifest.json
git commit -m "팝업: 사이트 탭·현재 상태·색 바꾸기·설정(언어, 두 사이트 같게) 동작, 기본 언어 en"
```

---

### Task 7: 마무리

**Files:**
- Modify: `tools/build-preview.mjs:1-30` (notes 코드 표시는 그대로 둔다 — 개발용 미리보기라 번역 불필요)
- Modify: `HANDOFF.md` 상태 표

- [ ] **Step 1: HANDOFF.md 상태 표 갱신**

`| 팝업 UI (목록, 커스텀 편집, 랜덤, ON/OFF) | 완성, headless 렌더 확인 | src/popup/ |` 줄을 아래로:

```
| 팝업 UI (사이트 탭, 현재 상태, 목록·편집·설정, 언어 ko/en) | 완성, 디버그 크롬 스크린샷 확인 | `src/popup/` (`popup.js` 상태 / `views.js` 렌더 / `i18n.js` 문자열) |
```

"남은 작업" 4번 `팝업: 사이트별 테마 토글, 테마 내보내기·가져오기` → `팝업: 테마 내보내기·가져오기 (설정 화면에 한 줄 추가)`.

- [ ] **Step 2: 전체 테스트 한 번 더**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# pass 72`, `# fail 0`

- [ ] **Step 3: 커밋**

```bash
git add HANDOFF.md
git commit -m "HANDOFF: 팝업 재설계 반영"
```
