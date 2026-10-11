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
