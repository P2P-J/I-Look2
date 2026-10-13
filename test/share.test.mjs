import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeTheme, decodeTheme } from '../src/popup/share.js';

test('encode: 버전/배경/포인트/사이드바/이름', () => {
  assert.equal(encodeTheme({ name: 'Romance', seeds: { bg: '#f9f2f5', accent: '#c14c8a' } }), 'ilook1/f9f2f5/c14c8a/-/Romance');
  assert.equal(encodeTheme({ name: '내 테마', seeds: { bg: '#1e1e2e', accent: '#cba6f7', sidebar: '#181825' } }), 'ilook1/1e1e2e/cba6f7/181825/내 테마');
});

test('decode: 왕복', () => {
  const t = { name: '밤 바다', seeds: { bg: '#1f282d', accent: '#2e7cd1', sidebar: '#182024' } };
  assert.deepEqual(decodeTheme(encodeTheme(t)), t);
  assert.deepEqual(decodeTheme('ilook1/f9f2f5/c14c8a/-/Romance'), { name: 'Romance', seeds: { bg: '#f9f2f5', accent: '#c14c8a' } });
});

test('decode: 앞뒤 공백·대문자·이름 속 슬래시 허용', () => {
  assert.deepEqual(decodeTheme('  ILOOK1/F9F2F5/C14C8A/-/A/B  '), { name: 'A/B', seeds: { bg: '#f9f2f5', accent: '#c14c8a' } });
});

test('decode: 잘못된 코드는 null', () => {
  for (const bad of ['', 'hello', 'ilook1/zzzzzz/c14c8a/-/x', 'ilook2/f9f2f5/c14c8a/-/x', 'ilook1/f9f2f5/c14c8a', 'ilook1/f9f2f5/c14c8a/-/']) {
    assert.equal(decodeTheme(bad), null, bad);
  }
});

test('이름은 24자로 자른다', () => {
  const long = 'x'.repeat(40);
  assert.equal(decodeTheme(`ilook1/f9f2f5/c14c8a/-/${long}`).name.length, 24);
});
