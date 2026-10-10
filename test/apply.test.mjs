import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCss, detectSite, schemeOf } from '../src/content/apply.js';

test('사이트 감지', () => {
  assert.equal(detectSite('claude.ai', '/chat/x'), 'claude');
  assert.equal(detectSite('claude.ai', '/code/artifact/x'), 'claude-code');
  assert.equal(detectSite('abc.frame.claudeusercontent.com', '/_f/1'), 'claude');
  assert.equal(detectSite('chatgpt.com', '/'), 'chatgpt');
  assert.equal(detectSite('example.com', '/'), null);
});

test('테마 밝기를 CSS에서 읽는다', () => {
  assert.equal(schemeOf(buildCss({ bg: '#e9f3f7', accent: '#337ea9' }).css), 'light');
  assert.equal(schemeOf(buildCss({ bg: '#1f282d', accent: '#2e7cd1' }).css), 'dark');
});

test('밝기 표시가 없는 옛 캐시는 빈 값', () => {
  assert.equal(schemeOf('html[data-ilook] { --ilook-bg-app: #fff; }'), '');
});
