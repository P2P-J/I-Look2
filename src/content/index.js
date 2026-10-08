import { buildCss, detectSite, injectCss, readCache, removeCss, writeCache } from './apply.js';
import { loadSettings, onSettingsChanged, resolveSeeds } from '../storage.js';

const site = detectSite();
let previewing = false;

function applyFromSettings(settings) {
  if (previewing) return;
  if (!settings.enabled) {
    removeCss();
    writeCache(null);
    return;
  }
  const { seeds } = resolveSeeds(settings, site);
  const { css } = buildCss(seeds);
  injectCss(css);
  writeCache(css);
}

function boot() {
  if (!site) return;
  const cached = readCache();
  if (cached) injectCss(cached);
  loadSettings().then(applyFromSettings);
  onSettingsChanged(applyFromSettings);
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'ilook:preview' && msg.seeds) {
    previewing = true;
    const { css, result } = buildCss(msg.seeds);
    injectCss(css);
    reply({ ok: true, notes: result.notes });
    return;
  }
  if (msg.type === 'ilook:preview-end') {
    previewing = false;
    loadSettings().then(applyFromSettings);
    reply({ ok: true });
    return;
  }
  if (msg.type === 'ilook:site') {
    reply({ site });
  }
});

boot();
