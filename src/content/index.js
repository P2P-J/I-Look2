import { buildCss, detectSite, injectCss, readCache, removeCss, writeCache } from './apply.js';
import { loadSettings, onSettingsChanged, resolveSeeds } from '../storage.js';

const site = detectSite();
let previewing = false;
let lastCss = null;

function applyFromSettings(settings) {
  if (previewing) return;
  if (!settings.enabled) {
    lastCss = null;
    removeCss();
    writeCache(null);
    return;
  }
  const { seeds } = resolveSeeds(settings, site);
  const { css } = buildCss(seeds);
  lastCss = css;
  injectCss(css);
  writeCache(css);
}

function guard() {
  const root = document.documentElement;
  const obs = new MutationObserver(() => {
    if (!lastCss) return;
    const attrGone = !root.hasAttribute('data-ilook');
    const styleGone = !document.getElementById('ilook-tokens');
    if (attrGone || styleGone) injectCss(lastCss);
  });
  obs.observe(root, { attributes: true, attributeFilter: ['data-ilook', 'class', 'data-mode'], childList: true, subtree: false });
  const watchHead = () => {
    if (document.head) obs.observe(document.head, { childList: true });
    else requestAnimationFrame(watchHead);
  };
  watchHead();
}

function boot() {
  if (!site) return;
  try {
    const cached = readCache();
    if (cached) {
      lastCss = cached;
      injectCss(cached);
    }
  } catch (e) {
    console.warn('[ilook] cache apply failed', e);
  }
  guard();
  loadSettings()
    .then(applyFromSettings)
    .catch((e) => console.warn('[ilook] settings load failed', e));
  onSettingsChanged(applyFromSettings);
  console.debug('[ilook] booted on', site);
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'ilook:preview' && msg.seeds) {
    previewing = true;
    const { css, result } = buildCss(msg.seeds);
    lastCss = css;
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
