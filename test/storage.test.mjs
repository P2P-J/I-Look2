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
