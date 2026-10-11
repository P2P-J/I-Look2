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
