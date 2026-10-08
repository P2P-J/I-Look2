import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastHex, hslTriple, isLight, parseHex, toHex, hexToOklch, oklchToHex } from '../src/engine/color.js';
import { derive, TOKEN_NAMES, CONTRAST } from '../src/engine/derive.js';

const EXTREME_SEEDS = [
  ['순백', { bg: '#ffffff', accent: '#2e7cd1' }],
  ['순흑', { bg: '#000000', accent: '#2e7cd1' }],
  ['중간 회색', { bg: '#767676', accent: '#2e7cd1' }],
  ['밝은 회색', { bg: '#c0c0c0', accent: '#2e7cd1' }],
  ['어두운 회색', { bg: '#3a3a3a', accent: '#2e7cd1' }],
  ['형광 핑크', { bg: '#ff00aa', accent: '#00ffcc' }],
  ['순노랑', { bg: '#ffff00', accent: '#0000ff' }],
  ['순파랑', { bg: '#0000ff', accent: '#ffff00' }],
  ['순빨강', { bg: '#ff0000', accent: '#00ff00' }],
  ['네온 그린', { bg: '#39ff14', accent: '#ff1493' }],
  ['포인트=배경', { bg: '#e9f3f7', accent: '#e9f3f7' }],
  ['포인트=배경 다크', { bg: '#1f282d', accent: '#1f282d' }],
  ['Notion Blue L', { bg: '#e9f3f7', accent: '#337ea9', sidebar: '#dde9ef' }],
  ['Notion Blue D', { bg: '#1f282d', accent: '#2e7cd1' }],
  ['Catppuccin Mocha', { bg: '#1e1e2e', accent: '#cba6f7', sidebar: '#181825' }],
  ['Rosé Pine Dawn', { bg: '#faf4ed', accent: '#d7827e', sidebar: '#fffaf3' }],
  ['Dracula', { bg: '#282a36', accent: '#bd93f9' }],
  ['밝은 본문 + 어두운 사이드바', { bg: '#f5f5f5', accent: '#d97757', sidebar: '#1a1a1a' }],
  ['어두운 본문 + 밝은 사이드바', { bg: '#121212', accent: '#d97757', sidebar: '#f0f0f0' }],
  ['거의 흰 크림', { bg: '#fdfcf8', accent: '#c96442' }],
];

test('hex 왕복', () => {
  assert.equal(toHex(parseHex('#2E7CD1')), '#2e7cd1');
  assert.equal(toHex(parseHex('#abc')), '#aabbcc');
});

test('OKLCH 왕복 오차', () => {
  for (const h of ['#000000', '#ffffff', '#2e7cd1', '#ff00aa', '#39ff14']) {
    const back = oklchToHex(hexToOklch(h));
    const a = parseHex(h);
    const b = parseHex(back);
    assert.ok(Math.abs(a.r - b.r) <= 1 && Math.abs(a.g - b.g) <= 1 && Math.abs(a.b - b.b) <= 1, `${h} → ${back}`);
  }
});

test('밝기 판정', () => {
  assert.equal(isLight('#ffffff'), true);
  assert.equal(isLight('#000000'), false);
  assert.equal(isLight('#ffff00'), true);
  assert.equal(isLight('#0000ff'), false);
});

test('HSL 세 성분 형식', () => {
  assert.match(hslTriple('#2e7cd1'), /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
  assert.equal(hslTriple('#ffffff'), '0 0% 100%');
});

for (const [name, seeds] of EXTREME_SEEDS) {
  test(`극단 시드 · ${name}`, () => {
    const { tokens, isLight: light } = derive(seeds);
    const bg = tokens['bg-app'];

    for (const n of TOKEN_NAMES) assert.ok(tokens[n], `토큰 누락: ${n}`);

    const body = contrastHex(tokens['text-primary'], bg);
    assert.ok(body >= CONTRAST.body.min, `text-primary 대비 ${body.toFixed(2)} < ${CONTRAST.body.min}`);
    assert.ok(contrastHex(tokens['text-heading'], bg) >= CONTRAST.body.min, 'text-heading');
    assert.ok(contrastHex(tokens['text-secondary'], bg) >= CONTRAST.secondary.min, 'text-secondary');
    assert.ok(contrastHex(tokens['text-muted'], bg) >= CONTRAST.muted.min, 'text-muted');
    assert.ok(contrastHex(tokens['text-link'], bg) >= 4.5, 'text-link');
    assert.ok(contrastHex(tokens['accent'], bg) >= 3, 'accent vs bg');
    assert.ok(contrastHex(tokens['text-on-accent'], tokens['accent']) >= 4.5, 'text-on-accent');
    assert.ok(contrastHex(tokens['text-on-user-msg'], tokens['bg-user-msg']) >= CONTRAST.body.min, 'text-on-user-msg');
    assert.ok(contrastHex(tokens['sidebar-text'], tokens['bg-sidebar']) >= CONTRAST.body.min, 'sidebar-text');
    assert.ok(contrastHex(tokens['sidebar-text-muted'], tokens['bg-sidebar']) >= CONTRAST.muted.min, 'sidebar-text-muted');
    assert.ok(contrastHex(tokens['sidebar-accent'], tokens['bg-sidebar']) >= 3, 'sidebar-accent');
    for (const s of ['danger', 'warning', 'success']) assert.ok(contrastHex(tokens[s], bg) >= 3, s);
    for (const s of ['keyword', 'string', 'number', 'function', 'property', 'type', 'punctuation', 'comment']) {
      assert.ok(contrastHex(tokens[`syntax-${s}`], tokens['bg-code']) >= 3, `syntax-${s}`);
    }

    for (const [n, min] of [['bg-hover', 1.1], ['bg-active', 1.2], ['bg-surface', 1.15], ['bg-elevated', 1.2], ['bg-code', 1.15], ['border-subtle', 1.25], ['border-strong', 1.8], ['bg-user-msg', 1.1]]) {
      assert.ok(contrastHex(tokens[n], bg) >= min, `${n} 배경과 구분 안 됨 (${contrastHex(tokens[n], bg).toFixed(2)})`);
    }
    for (const [n, min] of [['sidebar-hover', 1.1], ['sidebar-active', 1.2], ['sidebar-border', 1.25]]) {
      assert.ok(contrastHex(tokens[n], tokens['bg-sidebar']) >= min, `${n} 사이드바와 구분 안 됨`);
    }

    const textLight = isLight(tokens['text-primary']);
    assert.notEqual(textLight, light, `배경(${light ? '밝음' : '어두움'})과 글자 밝기가 같음`);
  });
}

test('중간 회색은 보정 안내가 뜬다', () => {
  const { notes } = derive({ bg: '#767676', accent: '#2e7cd1' });
  assert.ok(notes.some((n) => n.includes('배경 밝기')));
});

test('포인트=배경이면 포인트색 보정 안내가 뜬다', () => {
  const { notes } = derive({ bg: '#e9f3f7', accent: '#e9f3f7' });
  assert.ok(notes.some((n) => n.includes('포인트색')));
});

test('사이드바 미지정이면 자동 파생', () => {
  const { tokens } = derive({ bg: '#1e1e2e', accent: '#cba6f7' });
  assert.notEqual(tokens['bg-sidebar'], tokens['bg-app']);
});
