import { derive } from '../engine/derive.js';
import { hexToOklch, oklchToHex } from '../engine/color.js';
import { PRESETS, findPreset } from '../themes/presets.js';
import { loadSettings, saveSettings, resolveSeeds, newCustomId } from '../storage.js';

const $ = (sel) => document.querySelector(sel);
const SITE_LABEL = { chatgpt: 'ChatGPT', claude: 'Claude', 'claude-code': 'Claude Code' };

let settings = null;
let site = 'claude';
let filter = 'all';
let editing = null;
let previewTimer = null;

function miniHtml(seeds) {
  const t = derive(seeds).tokens;
  const vars = [
    ['m-bg', 'bg-app'], ['m-sidebar', 'bg-sidebar'], ['m-side-text', 'sidebar-text'], ['m-side-active', 'sidebar-active'],
    ['m-text', 'text-primary'], ['m-user', 'bg-user-msg'], ['m-code', 'bg-code'], ['m-surface', 'bg-surface'], ['m-border', 'border-subtle'], ['m-accent', 'accent'],
  ].map(([v, k]) => `--${v}:${t[k]}`).join(';');
  return `<div class="mini" style="${vars}">
    <div class="m-side"><i class="on"></i><i></i><i></i><i></i></div>
    <div class="m-main"><div class="m-user"></div><div class="m-line"></div><div class="m-line short"></div><div class="m-code"></div><div class="m-input"></div></div>
  </div>`;
}

function paintChrome(seeds) {
  const t = derive(seeds).tokens;
  const r = document.documentElement.style;
  const map = {
    '--bg': 'bg-app', '--surface': 'bg-surface', '--elevated': 'bg-elevated', '--hover': 'bg-hover', '--active': 'bg-active',
    '--text': 'text-primary', '--text-2': 'text-secondary', '--muted': 'text-muted', '--border': 'border-subtle', '--border-strong': 'border-strong',
    '--accent': 'accent', '--on-accent': 'text-on-accent', '--accent-soft': 'accent-soft', '--danger': 'danger', '--shadow': 'shadow',
  };
  for (const [v, k] of Object.entries(map)) r.setProperty(v, t[k]);
  r.setProperty('color-scheme', derive(seeds).isLight ? 'light' : 'dark');
}

function card(theme, activeId) {
  const b = document.createElement('button');
  b.className = 'card' + (theme.id === activeId ? ' is-active' : '');
  b.dataset.id = theme.id;
  b.setAttribute('aria-pressed', theme.id === activeId ? 'true' : 'false');
  b.innerHTML = `${miniHtml(theme.seeds)}<div class="label"><span>${theme.name}</span><small>${theme.series || ''}</small></div>`;
  return b;
}

function renderBrowse() {
  const active = resolveSeeds(settings, site).id;
  const pg = $('#preset-grid');
  pg.innerHTML = '';
  PRESETS.filter((p) => filter === 'all' || p.mode === filter).forEach((p) => pg.appendChild(card(p, active)));

  const cg = $('#custom-grid');
  cg.innerHTML = '';
  const customs = settings.customThemes || [];
  customs.forEach((c) => cg.appendChild(card({ ...c, series: '내 테마' }, active)));
  $('#custom-empty').hidden = customs.length > 0;

  $('#enabled').checked = settings.enabled;
  paintChrome(resolveSeeds(settings, site).seeds);
}

async function activate(id) {
  const key = settings.perSite ? site : 'claude';
  const activeTheme = { ...settings.activeTheme };
  if (settings.perSite) activeTheme[key] = id;
  else for (const k of Object.keys(activeTheme)) activeTheme[k] = id;
  settings = await saveSettings({ activeTheme, enabled: true });
  renderBrowse();
}

function show(view) {
  $('#view-browse').hidden = view !== 'browse';
  $('#view-edit').hidden = view !== 'edit';
}

function openEditor(theme, isNew) {
  editing = { id: isNew ? newCustomId() : theme.id, name: theme.name, seeds: { ...theme.seeds }, isNew };
  $('#theme-name').value = editing.name;
  $('#delete-custom').hidden = isNew;
  syncSeedInputs();
  renderEditPreview();
  show('edit');
  $('#theme-name').focus();
}

function syncSeedInputs() {
  const s = editing.seeds;
  $('#seed-bg').value = s.bg;
  $('#seed-bg-hex').value = s.bg;
  $('#seed-accent').value = s.accent;
  $('#seed-accent-hex').value = s.accent;
  $('#seed-sidebar').value = s.sidebar || derive(s).tokens['bg-sidebar'];
  $('#seed-sidebar-hex').value = s.sidebar || '';
}

function renderEditPreview() {
  const result = derive(editing.seeds);
  $('#edit-preview').outerHTML = miniHtml(editing.seeds).replace('class="mini"', 'class="mini big" id="edit-preview"');
  $('#notes').innerHTML = result.notes.map((n) => `<li>${n}</li>`).join('');
  paintChrome(editing.seeds);
  schedulePreview();
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => sendToTabs({ type: 'ilook:preview', seeds: editing.seeds }), 60);
}

async function sendToTabs(msg) {
  try {
    const tabs = await chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://claude.ai/*'] });
    await Promise.all(tabs.map((t) => chrome.tabs.sendMessage(t.id, msg).catch(() => {})));
  } catch (e) {}
}

function setSeed(key, hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  editing.seeds[key] = hex.toLowerCase();
  syncSeedInputs();
  renderEditPreview();
}

function randomSeeds() {
  const dark = Math.random() < 0.5;
  const H = Math.random() * 360;
  const bg = oklchToHex({ L: dark ? 0.2 + Math.random() * 0.08 : 0.94 + Math.random() * 0.04, C: 0.01 + Math.random() * 0.03, H });
  const offsets = [0, 60, 180, 210];
  const accH = (H + offsets[Math.floor(Math.random() * offsets.length)] + (Math.random() * 20 - 10) + 360) % 360;
  const accent = oklchToHex({ L: dark ? 0.72 : 0.55, C: 0.12 + Math.random() * 0.06, H: accH });
  return { bg, accent };
}

async function saveCustom() {
  const name = $('#theme-name').value.trim() || '내 테마';
  const list = (settings.customThemes || []).filter((t) => t.id !== editing.id);
  list.push({ id: editing.id, name, seeds: editing.seeds });
  settings = await saveSettings({ customThemes: list });
  await sendToTabs({ type: 'ilook:preview-end' });
  await activate(editing.id);
  show('browse');
}

async function deleteCustom() {
  const list = (settings.customThemes || []).filter((t) => t.id !== editing.id);
  const patch = { customThemes: list };
  if (resolveSeeds(settings, site).id === editing.id) {
    const at = { ...settings.activeTheme };
    for (const k of Object.keys(at)) if (at[k] === editing.id) at[k] = PRESETS[0].id;
    patch.activeTheme = at;
  }
  settings = await saveSettings(patch);
  await sendToTabs({ type: 'ilook:preview-end' });
  renderBrowse();
  show('browse');
}

async function detectActiveSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    const u = new URL(tab.url);
    if (u.hostname.endsWith('chatgpt.com')) site = 'chatgpt';
    else if (u.hostname.endsWith('claude.ai')) site = u.pathname.startsWith('/code') ? 'claude-code' : 'claude';
    else return;
    $('#site-label').textContent = SITE_LABEL[site];
  } catch (e) {}
}

function bind() {
  $('#enabled').addEventListener('change', async (e) => {
    settings = await saveSettings({ enabled: e.target.checked });
  });
  document.querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => {
      filter = c.dataset.filter;
      document.querySelectorAll('.chip').forEach((x) => {
        x.classList.toggle('is-on', x === c);
        x.setAttribute('aria-selected', x === c ? 'true' : 'false');
      });
      renderBrowse();
    })
  );
  $('#preset-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.card');
    if (b) activate(b.dataset.id);
  });
  $('#preset-grid').addEventListener('dblclick', (e) => {
    const b = e.target.closest('.card');
    if (b) openEditor({ ...findPreset(b.dataset.id), name: findPreset(b.dataset.id).name + ' 변형' }, true);
  });
  $('#custom-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.card');
    if (!b) return;
    const t = settings.customThemes.find((x) => x.id === b.dataset.id);
    if (e.detail === 2) openEditor(t, false);
    else activate(t.id);
  });
  $('#new-custom').addEventListener('click', () => {
    const base = resolveSeeds(settings, site);
    openEditor({ name: '내 테마', seeds: { ...base.seeds } }, true);
  });
  $('#back').addEventListener('click', async () => {
    await sendToTabs({ type: 'ilook:preview-end' });
    renderBrowse();
    show('browse');
  });
  for (const key of ['bg', 'accent', 'sidebar']) {
    $(`#seed-${key}`).addEventListener('input', (e) => setSeed(key, e.target.value));
    $(`#seed-${key}-hex`).addEventListener('change', (e) => setSeed(key, e.target.value.trim()));
  }
  $('#sidebar-auto').addEventListener('click', () => {
    delete editing.seeds.sidebar;
    syncSeedInputs();
    renderEditPreview();
  });
  $('#dice').addEventListener('click', () => {
    editing.seeds = randomSeeds();
    syncSeedInputs();
    renderEditPreview();
  });
  $('#save-custom').addEventListener('click', saveCustom);
  $('#delete-custom').addEventListener('click', deleteCustom);
  $('#about').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
  });
}

async function main() {
  settings = await loadSettings();
  await detectActiveSite();
  bind();
  renderBrowse();
}

main();
