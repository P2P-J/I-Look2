import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCss, schemeOf } from '../src/content/apply.js';

test('테마 밝기를 CSS에서 읽는다', () => {
  assert.equal(schemeOf(buildCss({ bg: '#e9f3f7', accent: '#337ea9' }).css), 'light');
  assert.equal(schemeOf(buildCss({ bg: '#1f282d', accent: '#2e7cd1' }).css), 'dark');
});

test('밝기 표시가 없는 옛 캐시는 빈 값', () => {
  assert.equal(schemeOf('html[data-ilook] { --ilook-bg-app: #fff; }'), '');
});
