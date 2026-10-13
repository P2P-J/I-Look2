import { buildCss, detectSite, injectCss, readCache, removeCss, writeCache } from './apply.js';
import { loadSettings, onSettingsChanged, resolveSeeds } from '../storage.js';

// 같은 프레임에 두 번 주입돼도(manifest + 백그라운드 scripting) 한 번만 부팅한다
if (window.__ilookBooted) {
  console.debug('[ilook] already booted');
} else {
  window.__ilookBooted = true;
  boot();
}

function boot() {
  const site = detectSite();
  if (!site) return;
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

  function endPreview() {
    if (!previewing) return;
    previewing = false;
    loadSettings().then(applyFromSettings);
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
      endPreview();
      reply({ ok: true });
      return;
    }
    if (msg.type === 'ilook:site') {
      reply({ site });
    }
  });

  // 팝업이 편집 화면에 있는 동안 포트를 연다. 팝업이 닫히면(저장·뒤로 없이 바깥 클릭 등) 포트가 끊기므로
  // 미리보기 상태에 갇히지 않고 저장된 테마로 돌아간다.
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'ilook:preview') return;
    port.onDisconnect.addListener(endPreview);
  });

  console.debug('[ilook] booted on', site);
}
