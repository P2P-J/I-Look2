import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastHex } from '../src/engine/color.js';
import { derive, CONTRAST } from '../src/engine/derive.js';
import { PRESETS } from '../src/themes/presets.js';

// 글자 토큰은 bg-app뿐 아니라 글자가 실제로 놓이는 모든 면 위에서 대비를 지켜야 한다.
const SURFACES = ['bg-app', 'bg-sidebar', 'bg-surface', 'bg-elevated', 'bg-hover', 'bg-active', 'bg-user-msg', 'bg-code', 'bg-inline-code'];
const SEEDS = [
  ...PRESETS.map((p) => [p.name, p.seeds]),
  ['순백', { bg: '#ffffff', accent: '#2e7cd1' }],
  ['순흑', { bg: '#000000', accent: '#2e7cd1' }],
  ['거의 흰 크림', { bg: '#fdfcf8', accent: '#c96442' }],
  ['형광 핑크', { bg: '#ff00aa', accent: '#00ffcc' }],
  ['어두운 본문 + 밝은 사이드바', { bg: '#121212', accent: '#d97757', sidebar: '#f0f0f0' }],
];

for (const [name, seeds] of SEEDS) {
  test(`모든 면 위 글자 대비 · ${name}`, () => {
    const { tokens: t } = derive(seeds);
    for (const s of SURFACES) {
      if (s === 'bg-sidebar') continue; // 사이드바는 별도 토큰(sidebar-text*)을 쓴다
      assert.ok(contrastHex(t['text-muted'], t[s]) >= CONTRAST.muted.min, `text-muted on ${s}: ${contrastHex(t['text-muted'], t[s]).toFixed(2)}`);
      assert.ok(contrastHex(t['text-secondary'], t[s]) >= CONTRAST.secondary.min, `text-secondary on ${s}: ${contrastHex(t['text-secondary'], t[s]).toFixed(2)}`);
      assert.ok(contrastHex(t['text-link'], t[s]) >= 4.5, `text-link on ${s}: ${contrastHex(t['text-link'], t[s]).toFixed(2)}`);
    }
    for (const s of ['bg-sidebar', 'sidebar-hover', 'sidebar-active']) {
      assert.ok(contrastHex(t['sidebar-text-muted'], t[s]) >= CONTRAST.muted.min, `sidebar-text-muted on ${s}: ${contrastHex(t['sidebar-text-muted'], t[s]).toFixed(2)}`);
      assert.ok(contrastHex(t['sidebar-accent'], t[s]) >= 3, `sidebar-accent on ${s}: ${contrastHex(t['sidebar-accent'], t[s]).toFixed(2)}`);
    }
    for (const k of ['syntax-keyword', 'syntax-string', 'syntax-number', 'syntax-function', 'syntax-property', 'syntax-type', 'syntax-punctuation']) {
      assert.ok(contrastHex(t[k], t['bg-code']) >= 4.5, `${k} on bg-code: ${contrastHex(t[k], t['bg-code']).toFixed(2)}`);
    }
    assert.ok(contrastHex(t['syntax-comment'], t['bg-code']) >= 3, 'syntax-comment on bg-code');
  });
}
