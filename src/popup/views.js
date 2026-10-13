// 팝업 DOM 렌더. 저장·메시지는 popup.js가 한다.
import { derive } from '../engine/derive.js';
import { alpha, bestOf, ensureContrast, mix, shiftL } from '../engine/color.js';
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

// 콘솔 팔레트: 팝업 틀은 테마와 분리된 "콘솔"이지만 테마 밝기를 따르고(어두우면 밤, 밝으면 종이) 테마 색으로 살짝 물든다.
// 포인트색은 테마 accent를 쓰되 콘솔 면 위에서 3:1을 보장한다.
export function consolePalette(seeds) {
  const r = derive(seeds);
  const t = r.tokens;
  const light = r.isLight;
  const bg = mix(light ? '#f3f0e8' : '#0b0f16', t['bg-app'], light ? 0.4 : 0.3);
  const panel = shiftL(bg, light ? -0.035 : 0.045);
  const well = shiftL(bg, light ? -0.018 : -0.02);
  const tile = shiftL(bg, light ? -0.055 : 0.075);
  const edge = shiftL(bg, light ? -0.17 : 0.17);
  const fg = ensureContrast(light ? '#1b1a17' : '#f1efe8', bg, 7);
  const fg2 = ensureContrast(mix(bg, fg, 0.72), tile, 4.5);
  const mut = ensureContrast(mix(bg, fg, 0.5), tile, 3);
  const acc = ensureContrast(t.accent, panel, 3);
  const accInk = bestOf(['#07111a', '#ffffff'], acc);
  return {
    'c-bg': bg, 'c-panel': panel, 'c-well': well, 'c-tile': tile, 'c-edge': edge,
    'c-fg': fg, 'c-fg2': fg2, 'c-mut': mut,
    'c-acc': acc, 'c-acc-ink': accInk, 'c-acc-soft': alpha(acc, light ? 0.14 : 0.18), 'c-acc-glow': alpha(acc, light ? 0.28 : 0.4),
    'c-line': light ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.10)',
    'c-line2': light ? 'rgba(0,0,0,.20)' : 'rgba(255,255,255,.18)',
    'c-hi': light ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.06)',
    'c-grid': light ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.028)',
    'c-live': light ? '#1f8a4a' : '#7ce0a8', 'c-live-bg': light ? 'rgba(31,138,74,.12)' : 'rgba(46,158,91,.18)',
    'c-warn': light ? '#7a4f00' : '#ffd27a', 'c-warn-bd': light ? 'rgba(170,110,0,.45)' : 'rgba(255,210,122,.4)', 'c-warn-bg': light ? 'rgba(242,181,58,.16)' : 'rgba(242,181,58,.12)',
    'c-bad': light ? '#b83232' : '#ff8c7a',
    scheme: light ? 'light' : 'dark',
  };
}

export function paintChrome(seeds) {
  const p = consolePalette(seeds);
  const s = document.documentElement.style;
  for (const [k, v] of Object.entries(p)) if (k !== 'scheme') s.setProperty('--' + k, v);
  s.setProperty('color-scheme', p.scheme);
}

export function renderHeader(site, enabled) {
  document.querySelectorAll('.tab').forEach((b) => {
    const on = b.dataset.site === site;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $('#enabled').checked = enabled;
}

const dot = (hex) => `<i class="dot" style="background:${hex}"></i>`;

export function renderNow(current, site, enabled, t) {
  const r = derive(current.seeds);
  const preset = PRESETS.find((p) => p.id === current.id);
  $('#now-mini').innerHTML = miniHtml(current.seeds);
  $('#now-name').textContent = current.name;
  $('#now-mode').textContent = r.isLight ? t('popup_tag_light') : t('popup_tag_dark');
  $('#now-series').textContent = current.custom ? t('popup_mine') : (preset?.series || '');
  const applied = $('#now-sub');
  applied.textContent = enabled ? t('popup_now_applied', { site: SITE_NAME[site] }) : t('popup_now_off');
  applied.classList.toggle('is-off', !enabled);
  const s = current.seeds;
  $('#now-stats').innerHTML = [
    ['BG', s.bg, s.bg], ['ACCENT', s.accent, s.accent], ['SIDEBAR', s.sidebar || r.tokens['bg-sidebar'], s.sidebar || t('popup_auto')],
  ].map(([k, hex, label]) => `<div><span>${k}</span>${dot(hex)}<em>${esc(label)}</em></div>`).join('');
  $('#sec-hint').textContent = t('popup_hint_apply', { site: SITE_NAME[site] });
}

function card(theme, activeId, t) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'card' + (theme.id === activeId ? ' is-active' : '');
  b.dataset.id = theme.id;
  b.setAttribute('aria-pressed', theme.id === activeId ? 'true' : 'false');
  const right = theme.custom
    ? `<span class="tag edit" data-edit="${esc(theme.id)}">${esc(t('popup_edit'))}</span>`
    : `<span class="tag">${esc(theme.series || '')}</span>`;
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
  $('#sec-count').textContent = String(items.length);
  $('#foot-count').textContent = t('popup_count', { presets: PRESETS.length, mine: customs.length });
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
  $('#edit-mode').textContent = result.isLight ? t('popup_tag_light') : t('popup_tag_dark');
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
  $('#version').textContent = 'I LOOK · v' + chrome.runtime.getManifest().version;
}
