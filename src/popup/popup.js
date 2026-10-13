import { oklchToHex } from '../engine/color.js';
import { PRESETS } from '../themes/presets.js';
import { loadSettings, saveSettings, resolveSeeds, newCustomId, siteKey, otherSite } from '../storage.js';
import { detectSite as detectSiteOf } from '../content/apply.js';
import * as i18n from './i18n.js';
import { encodeTheme, decodeTheme } from './share.js';
import { renderHeader, renderNow, renderGrid, renderChips, renderEditor, renderSettings, paintChrome, SITE_NAME } from './views.js';

const $ = (sel) => document.querySelector(sel);
const t = i18n.t;

let settings = null;
let site = 'claude';
let filter = 'all';
let editing = null;
let previewTimer = null;
let previewPorts = [];
let importing = false;

const current = () => resolveSeeds(settings, site);

function show(view) {
  for (const v of ['list', 'edit', 'settings']) $(`#view-${v}`).hidden = v !== view;
}

function renderList() {
  const cur = current();
  renderHeader(site, settings.enabled);
  renderNow(cur, site, settings.enabled, t);
  renderChips(filter);
  renderGrid(settings, filter, cur.id, t);
  paintChrome(cur.seeds);
}

async function applyLang() {
  const lang = i18n.pickLang(settings.lang, chrome.i18n.getUILanguage());
  await i18n.load(lang);
  document.documentElement.lang = lang;
  i18n.apply(document);
}

async function activate(id) {
  settings = await saveSettings({ activeTheme: { ...settings.activeTheme, [siteKey(site)]: id }, enabled: true });
  renderList();
}

function switchSite(next) {
  site = next;
  renderList();
}

/* 편집 */
function openEditor(theme, isNew) {
  editing = { id: isNew ? newCustomId() : theme.id, name: theme.name, seeds: { ...theme.seeds }, isNew };
  renderEditor(editing, t);
  show('edit');
  $('#theme-name').focus();
  startPreviewSession().then(schedulePreview);
}

// 편집 중에는 열린 사이트 탭마다 포트를 열어 둔다. 팝업이 닫히면 포트가 끊겨 탭이 저장된 테마로 돌아간다.
async function startPreviewSession() {
  endPreviewSession();
  try {
    const tabs = await chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://claude.ai/*'] });
    previewPorts = tabs.map((tab) => { try { return chrome.tabs.connect(tab.id, { name: 'ilook:preview' }); } catch (e) { return null; } }).filter(Boolean);
  } catch (e) {}
}

function endPreviewSession() {
  clearTimeout(previewTimer);
  previewTimer = null;
  for (const port of previewPorts) { try { port.disconnect(); } catch (e) {} }
  previewPorts = [];
}

function changeColors() {
  const cur = current();
  if (cur.custom) openEditor(settings.customThemes.find((c) => c.id === cur.id), false);
  else openEditor({ name: t('popup_variant_suffix', { name: cur.name }), seeds: cur.seeds }, true);
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => sendToTabs({ type: 'ilook:preview', seeds: editing.seeds }), 60);
}

async function sendToTabs(msg) {
  try {
    const tabs = await chrome.tabs.query({ url: ['https://chatgpt.com/*', 'https://claude.ai/*'] });
    await Promise.all(tabs.map((tab) => chrome.tabs.sendMessage(tab.id, msg).catch(() => {})));
  } catch (e) {}
}

function setSeed(key, hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  editing.seeds[key] = hex.toLowerCase();
  renderEditor(editing, t);
  schedulePreview();
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
  const name = $('#theme-name').value.trim() || t('popup_default_theme_name');
  const list = (settings.customThemes || []).filter((x) => x.id !== editing.id);
  list.push({ id: editing.id, name, seeds: editing.seeds });
  settings = await saveSettings({ customThemes: list });
  endPreviewSession();
  filter = 'mine';
  await activate(editing.id);
  show('list');
}

async function deleteCustom() {
  const list = (settings.customThemes || []).filter((x) => x.id !== editing.id);
  const activeTheme = { ...settings.activeTheme };
  for (const k of Object.keys(activeTheme)) if (activeTheme[k] === editing.id) activeTheme[k] = PRESETS[0].id;
  settings = await saveSettings({ customThemes: list, activeTheme });
  endPreviewSession();
  renderList();
  show('list');
}

function backToList() {
  endPreviewSession();
  renderList();
  show('list');
}

/* 공유 코드 */
async function copyCode(theme, btn) {
  try { await navigator.clipboard.writeText(encodeTheme(theme)); } catch (e) {}
  btn.textContent = t('popup_copied');
  setTimeout(() => { btn.textContent = t('popup_copy_code'); }, 1500);
}

async function importCode() {
  if (importing) return;
  const sub = $('#import-sub');
  const theme = decodeTheme($('#import-code').value);
  if (!theme) {
    sub.textContent = t('popup_import_invalid');
    sub.classList.add('is-error');
    return;
  }
  importing = true;
  try {
    const list = [...(settings.customThemes || []), { id: newCustomId(), ...theme }];
    settings = await saveSettings({ customThemes: list });
    filter = 'mine';
    await activate(list[list.length - 1].id);
    $('#import-code').value = '';
    sub.classList.remove('is-error');
    sub.textContent = t('popup_import_done', { site: SITE_NAME[site] });
  } finally {
    importing = false;
  }
}

/* 설정 */
function openSettings() {
  renderSettings(settings, site, current(), t);
  show('settings');
}

async function setLang(lang) {
  settings = await saveSettings({ lang });
  await applyLang();
  renderSettings(settings, site, current(), t);
}

async function copyToOther() {
  const activeTheme = { ...settings.activeTheme, [otherSite(site)]: settings.activeTheme[siteKey(site)] };
  settings = await saveSettings({ activeTheme });
  $('#same-theme-apply').textContent = t('popup_applied_done');
}

async function detectSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const u = new URL(tab?.url || '');
    const s = detectSiteOf(u.hostname, u.pathname);
    if (s) return siteKey(s);
  } catch (e) {}
  return settings.lastSite;
}

function bind() {
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchSite(b.dataset.site)));
  $('#enabled').addEventListener('change', async (e) => {
    settings = await saveSettings({ enabled: e.target.checked });
    renderList();
  });
  $('#open-settings').addEventListener('click', openSettings);
  $('#change-colors').addEventListener('click', changeColors);
  $('#copy-code-now').addEventListener('click', (e) => copyCode(current(), e.currentTarget));
  document.querySelectorAll('.chip').forEach((c) =>
    c.addEventListener('click', () => {
      filter = c.dataset.filter;
      renderList();
    })
  );
  $('#grid').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      e.stopPropagation();
      openEditor(settings.customThemes.find((c) => c.id === edit.dataset.edit), false);
      return;
    }
    const b = e.target.closest('.card');
    if (b) activate(b.dataset.id);
  });
  $('#new-theme').addEventListener('click', () => openEditor({ name: t('popup_default_theme_name'), seeds: { ...current().seeds } }, true));

  $('#back-edit').addEventListener('click', backToList);
  for (const key of ['bg', 'accent', 'sidebar']) {
    $(`#seed-${key}`).addEventListener('input', (e) => setSeed(key, e.target.value));
    $(`#seed-${key}-hex`).addEventListener('change', (e) => setSeed(key, e.target.value.trim()));
  }
  $('#sidebar-auto').addEventListener('change', (e) => {
    if (e.target.checked) delete editing.seeds.sidebar;
    else editing.seeds.sidebar = $('#seed-sidebar').value;
    renderEditor(editing, t);
    schedulePreview();
  });
  $('#dice').addEventListener('click', () => {
    editing.seeds = randomSeeds();
    renderEditor(editing, t);
    schedulePreview();
  });
  $('#copy-code').addEventListener('click', (e) => copyCode({ name: $('#theme-name').value.trim() || editing.name, seeds: editing.seeds }, e.currentTarget));
  $('#save-custom').addEventListener('click', saveCustom);
  $('#delete-custom').addEventListener('click', deleteCustom);

  $('#back-settings').addEventListener('click', () => {
    renderList();
    show('list');
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $('#same-theme-apply').addEventListener('click', copyToOther);
  $('#import-add').addEventListener('click', importCode);
  $('#import-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') importCode(); });
  $('#import-code').addEventListener('input', () => { $('#import-sub').classList.remove('is-error'); $('#import-sub').textContent = t('popup_import_sub'); });
  $('#sources').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
  });
}

async function main() {
  settings = await loadSettings({ migrate: true });
  site = await detectSite();
  await applyLang();
  bind();
  renderList();
  // 마지막에 보던 사이트는 팝업이 닫힐 때 한 번만 저장한다 (탭 클릭마다 쓰면 모든 탭이 다시 렌더한다)
  window.addEventListener('pagehide', () => {
    if (site !== settings.lastSite) chrome.storage.sync.set({ lastSite: site });
  });
}

main();
