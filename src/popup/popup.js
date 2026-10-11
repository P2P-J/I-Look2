import { oklchToHex } from '../engine/color.js';
import { PRESETS } from '../themes/presets.js';
import { loadSettings, saveSettings, resolveSeeds, newCustomId, siteKey } from '../storage.js';
import * as i18n from './i18n.js';
import { renderHeader, renderNow, renderGrid, renderChips, renderEditor, renderSettings, paintChrome, SITE_NAME } from './views.js';

const $ = (sel) => document.querySelector(sel);
const t = i18n.t;

let settings = null;
let site = 'claude';
let filter = 'all';
let editing = null;
let previewTimer = null;

const current = () => resolveSeeds(settings, site);
const otherSite = () => (site === 'chatgpt' ? 'claude' : 'chatgpt');

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

async function switchSite(next) {
  site = next;
  settings = await saveSettings({ lastSite: site });
  renderList();
}

/* 편집 */
function openEditor(theme, isNew) {
  editing = { id: isNew ? newCustomId() : theme.id, name: theme.name, seeds: { ...theme.seeds }, isNew };
  renderEditor(editing, t);
  $('#preview-hint').textContent = t('popup_preview_hint', { site: SITE_NAME[site] });
  show('edit');
  $('#theme-name').focus();
  schedulePreview();
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
  await sendToTabs({ type: 'ilook:preview-end' });
  await activate(editing.id);
  show('list');
}

async function deleteCustom() {
  const list = (settings.customThemes || []).filter((x) => x.id !== editing.id);
  const activeTheme = { ...settings.activeTheme };
  for (const k of Object.keys(activeTheme)) if (activeTheme[k] === editing.id) activeTheme[k] = PRESETS[0].id;
  settings = await saveSettings({ customThemes: list, activeTheme });
  await sendToTabs({ type: 'ilook:preview-end' });
  renderList();
  show('list');
}

async function backToList() {
  await sendToTabs({ type: 'ilook:preview-end' });
  renderList();
  show('list');
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
  const activeTheme = { ...settings.activeTheme, [otherSite()]: settings.activeTheme[siteKey(site)] };
  settings = await saveSettings({ activeTheme });
  $('#same-theme-apply').textContent = t('popup_applied_done');
}

async function detectSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const u = new URL(tab?.url || '');
    if (u.hostname.endsWith('chatgpt.com')) return 'chatgpt';
    if (u.hostname.endsWith('claude.ai')) return 'claude';
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
  $('#save-custom').addEventListener('click', saveCustom);
  $('#delete-custom').addEventListener('click', deleteCustom);

  $('#back-settings').addEventListener('click', () => {
    renderList();
    show('list');
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $('#same-theme-apply').addEventListener('click', copyToOther);
  $('#sources').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
  });
}

async function main() {
  settings = await loadSettings();
  site = await detectSite();
  await applyLang();
  bind();
  renderList();
}

main();
