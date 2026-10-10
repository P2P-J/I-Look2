import { derive } from '../engine/derive.js';
import { hslTriple, rgbTriple } from '../engine/color.js';

export const CACHE_KEY = 'ilook:css';
export const STYLE_ID = 'ilook-tokens';
export const ROOT_ATTR = 'data-ilook';

export function detectSite(hostname = location.hostname, pathname = location.pathname) {
  if (hostname === 'chatgpt.com' || hostname.endsWith('.chatgpt.com')) return 'chatgpt';
  if (hostname === 'claude.ai' || hostname.endsWith('.claude.ai')) return pathname.startsWith('/code') ? 'claude-code' : 'claude';
  return null;
}

function isHex(v) {
  return /^#[0-9a-f]{6}$/i.test(v);
}

export function tokensToCss(tokens, isLight) {
  const lines = [];
  for (const [k, v] of Object.entries(tokens)) {
    lines.push(`  --ilook-${k}: ${v};`);
    if (isHex(v)) {
      lines.push(`  --ilook-${k}-hsl: ${hslTriple(v)};`);
      lines.push(`  --ilook-${k}-rgb: ${rgbTriple(v)};`);
    }
  }
  lines.push(`  --ilook-scheme: ${isLight ? 'light' : 'dark'};`);
  lines.push(`  color-scheme: ${isLight ? 'light' : 'dark'};`);
  return `html[${ROOT_ATTR}] {\n${lines.join('\n')}\n}`;
}

export function buildCss(seeds) {
  const result = derive(seeds);
  return { css: tokensToCss(result.tokens, result.isLight), result };
}

// 어댑터가 html[data-ilook='light'|'dark']로 사이트 자체 모드 스위치를 테마 밝기에 맞춘다.
export function schemeOf(css) {
  const m = css.match(/--ilook-scheme: (light|dark);/);
  return m ? m[1] : '';
}

export function injectCss(css) {
  const root = document.documentElement;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    (document.head || root).appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
  root.setAttribute(ROOT_ATTR, schemeOf(css));
}

export function removeCss() {
  document.documentElement.removeAttribute(ROOT_ATTR);
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

export function readCache() {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch (e) {
    return null;
  }
}

export function writeCache(css) {
  try {
    if (css) localStorage.setItem(CACHE_KEY, css);
    else localStorage.removeItem(CACHE_KEY);
  } catch (e) {}
}
