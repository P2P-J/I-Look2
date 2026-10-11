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
