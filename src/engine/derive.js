import {
  alpha,
  bestOf,
  clamp,
  contrastHex,
  distinct,
  ensureContrast,
  hexToOklch,
  isLight,
  mix,
  oklchToHex,
  shiftL,
  targetContrast,
  textOn,
  withChroma,
} from './color.js';

export const TOKEN_NAMES = [
  'bg-app', 'bg-sidebar', 'bg-surface', 'bg-elevated', 'bg-user-msg', 'bg-code', 'bg-inline-code', 'bg-hover', 'bg-active', 'overlay-dim',
  'text-primary', 'text-heading', 'text-secondary', 'text-muted', 'text-link', 'text-on-accent', 'text-on-user-msg',
  'border-subtle', 'border-strong', 'focus-ring',
  'accent', 'accent-hover', 'accent-soft',
  'danger', 'warning', 'success',
  'syntax-keyword', 'syntax-string', 'syntax-number', 'syntax-comment', 'syntax-function', 'syntax-property', 'syntax-type', 'syntax-punctuation',
  'sidebar-text', 'sidebar-text-muted', 'sidebar-hover', 'sidebar-active', 'sidebar-border', 'sidebar-accent',
  'shadow', 'scrim', 'skeleton', 'toggle-off', 'badge', 'tooltip',
  'diff-add', 'diff-remove',
];

export const CONTRAST = {
  body: { target: 7, min: 4.5 },
  secondary: { target: 5.5, min: 4.5 },
  muted: { target: 3.5, min: 3 },
  ui: { target: 3, min: 3 },
};

export const LAYER = {
  hover: 1.12,
  active: 1.25,
  surface: 1.18,
  elevated: 1.4,
  elevatedLight: 1.22,
  code: 1.2,
  inlineCode: 1.25,
  borderSubtle: 1.3,
  borderStrong: 1.9,
  skeleton: 1.2,
  sidebar: 1.1,
};

export function normalizeBackground(hex) {
  const lch = hexToOklch(hex);
  const notes = [];
  let L = lch.L;
  const midLow = 0.52;
  const midHigh = 0.66;
  if (L > midLow && L < midHigh) {
    L = L - midLow < midHigh - L ? midLow : midHigh;
    notes.push('bg-adjusted');
  }
  if (lch.C > 0.2) notes.push('bg-saturated');
  return { hex: oklchToHex({ L, C: lch.C, H: lch.H }), notes };
}

function raise(bgHex, text, amount, minRatio, light) {
  const mixed = mix(bgHex, text, amount);
  return distinct(mixed, bgHex, minRatio, light ? 'darker' : 'lighter');
}

function surface(bgHex, light) {
  const lch = hexToOklch(bgHex);
  let candidate;
  if (light) {
    candidate = lch.L > 0.985 ? shiftL(bgHex, -0.025) : oklchToHex({ L: Math.min(1, lch.L + (1 - lch.L) * 0.6), C: lch.C * 0.8, H: lch.H });
  } else {
    candidate = shiftL(bgHex, 0.05);
  }
  return distinct(candidate, bgHex, LAYER.surface, light ? 'darker' : 'lighter');
}

function elevated(bgHex, light) {
  const lch = hexToOklch(bgHex);
  let candidate;
  if (light) {
    candidate = lch.L > 0.985 ? shiftL(bgHex, -0.04) : oklchToHex({ L: Math.min(1, lch.L + (1 - lch.L) * 0.95), C: lch.C * 0.6, H: lch.H });
  } else {
    candidate = shiftL(bgHex, 0.1);
  }
  return distinct(candidate, bgHex, light ? LAYER.elevatedLight : LAYER.elevated, light ? "darker" : "lighter");
}

function fixedStatus(baseHex, bgHex) {
  return targetContrast(baseHex, bgHex, 4.5, 3);
}

function syntaxPalette(accentHex, bgCode, textMutedOnCode) {
  const acc = hexToOklch(accentHex);
  const light = isLight(bgCode);
  const L = light ? 0.45 : 0.78;
  const C = clamp(Math.max(acc.C, 0.1), 0.1, 0.16);
  const make = (offset) => ensureContrast(oklchToHex({ L, C, H: (acc.H + offset) % 360 }), bgCode, 4.5);
  return {
    'syntax-keyword': make(0),
    'syntax-string': make(130),
    'syntax-number': make(60),
    'syntax-comment': textMutedOnCode,
    'syntax-function': make(200),
    'syntax-property': make(270),
    'syntax-type': make(320),
    'syntax-punctuation': ensureContrast(withChroma(oklchToHex({ L: light ? 0.5 : 0.75, C: 0.01, H: acc.H }), 0.01), bgCode, 4.5),
  };
}

export function deriveSidebar(sidebarBg, accentHex) {
  const light = isLight(sidebarBg);
  const text = textOn(sidebarBg, CONTRAST.body.target, CONTRAST.body.min);
  const hover = raise(sidebarBg, text, 0.07, LAYER.hover, light);
  const active = raise(sidebarBg, text, 0.12, LAYER.active, light);
  // 흐린 글자와 포인트는 선택된 항목(active) 위에서도 보여야 한다
  const muted = ensureContrast(
    targetContrast(mix(sidebarBg, text, 0.55), sidebarBg, CONTRAST.muted.target, CONTRAST.muted.min, { direction: light ? 'darker' : 'lighter' }),
    active, CONTRAST.muted.min, { direction: light ? 'darker' : 'lighter' });
  return {
    'sidebar-text': text,
    'sidebar-text-muted': muted,
    'sidebar-hover': hover,
    'sidebar-active': active,
    'sidebar-border': raise(sidebarBg, text, 0.14, LAYER.borderSubtle, light),
    'sidebar-accent': ensureContrast(targetContrast(accentHex, sidebarBg, 3, 3), active, 3, { direction: light ? 'darker' : 'lighter' }),
  };
}

function autoSidebar(bg, light) {
  const candidate = shiftL(bg, light ? -0.03 : -0.02);
  return distinct(candidate, bg, LAYER.sidebar, 'darker');
}

export function derive(seeds) {
  const bgNorm = normalizeBackground(seeds.bg);
  const bg = bgNorm.hex;
  const light = isLight(bg);
  const notes = [...bgNorm.notes];

  const textPrimary = textOn(bg, CONTRAST.body.target, CONTRAST.body.min);
  const textHeading = ensureContrast(shiftL(textPrimary, light ? -0.08 : 0.05), bg, CONTRAST.body.min);
  let textSecondary = targetContrast(mix(bg, textPrimary, 0.72), bg, CONTRAST.secondary.target, CONTRAST.secondary.min, { direction: light ? 'darker' : 'lighter' });
  let textMuted = targetContrast(mix(bg, textPrimary, 0.5), bg, CONTRAST.muted.target, CONTRAST.muted.min, { direction: light ? 'darker' : 'lighter' });

  let accent = seeds.accent;
  if (contrastHex(accent, bg) < 3) {
    accent = ensureContrast(accent, bg, 3);
    notes.push('accent-adjusted');
  }
  let textOnAccent = bestOf(['#ffffff', '#111111'], accent);
  if (contrastHex(textOnAccent, accent) < 4.5) {
    const darkened = ensureContrast(accent, '#ffffff', 4.5, { direction: 'darker' });
    const lightened = ensureContrast(accent, '#111111', 4.5, { direction: 'lighter' });
    const darkOk = contrastHex(darkened, bg) >= 3;
    const lightOk = contrastHex(lightened, bg) >= 3;
    if (darkOk && (!lightOk || !light)) {
      accent = darkened;
      textOnAccent = '#ffffff';
    } else if (lightOk) {
      accent = lightened;
      textOnAccent = '#111111';
    } else {
      accent = darkOk ? darkened : lightened;
      textOnAccent = bestOf(['#ffffff', '#111111'], accent);
    }
    if (Math.abs(hexToOklch(accent).L - hexToOklch(seeds.accent).L) > 0.04) notes.push('accent-text-adjusted');
  }
  const accentHover = shiftL(accent, isLight(accent) ? -0.06 : 0.06);
  const accentSoft = mix(bg, seeds.accent, 0.2);
  let textLink = targetContrast(seeds.accent, bg, 4.5, 4.5);

  const sidebarBg = seeds.sidebar ? normalizeBackground(seeds.sidebar).hex : autoSidebar(bg, light);
  const sidebar = deriveSidebar(sidebarBg, accent);

  const bgSurface = surface(bg, light);
  const bgElevated = elevated(bg, light);
  const bgUserMsg = distinct(mix(bg, seeds.accent, light ? 0.14 : 0.18), bg, LAYER.hover, light ? 'darker' : 'lighter');
  const textOnUserMsg = textOn(bgUserMsg, CONTRAST.body.target, CONTRAST.body.min);
  const bgCode = distinct(light ? mix(shiftL(bg, -0.03), textPrimary, 0.04) : mix(shiftL(bg, 0.03), textPrimary, 0.04), bg, LAYER.code, light ? 'darker' : 'lighter');
  const bgInlineCode = raise(bg, textPrimary, 0.08, LAYER.inlineCode, light);
  const bgHover = raise(bg, textPrimary, 0.06, LAYER.hover, light);
  const bgActive = raise(bg, textPrimary, 0.1, LAYER.active, light);

  // 글자는 bg-app 말고도 입력창(surface)·메뉴(elevated)·말풍선·코드 면 위에 놓인다.
  // 그중 대비가 가장 낮은 면을 기준으로 한 번 더 보장한다.
  const surfaces = [bg, bgSurface, bgElevated, bgUserMsg, bgCode, bgInlineCode, bgHover, bgActive];
  const onAllSurfaces = (fg, min) => {
    const worst = surfaces.reduce((a, b) => (contrastHex(fg, b) < contrastHex(fg, a) ? b : a));
    const fixed = ensureContrast(fg, worst, min, { direction: light ? 'darker' : 'lighter' });
    // 중간 회색 배경처럼 목표에 닿을 수 없으면 ensureContrast가 방향을 뒤집는다. 그땐 원래 색을 둔다.
    const dL = hexToOklch(fixed).L - hexToOklch(fg).L;
    return (light ? dL <= 0 : dL >= 0) ? fixed : fg;
  };
  textSecondary = onAllSurfaces(textSecondary, CONTRAST.secondary.min);
  textMuted = onAllSurfaces(textMuted, CONTRAST.muted.min);
  textLink = onAllSurfaces(textLink, 4.5);

  const borderSubtle = raise(bg, textPrimary, 0.12, LAYER.borderSubtle, light);
  const borderStrong = raise(bg, textPrimary, 0.25, LAYER.borderStrong, light);

  const danger = fixedStatus(light ? '#d13a3a' : '#f07070', bg);
  const warning = fixedStatus(light ? '#b26a00' : '#f0b24a', bg);
  const success = fixedStatus(light ? '#1f8a4a' : '#5ec98a', bg);

  const tokens = {
    'bg-app': bg,
    'bg-sidebar': sidebarBg,
    'bg-surface': bgSurface,
    'bg-elevated': bgElevated,
    'bg-user-msg': bgUserMsg,
    'bg-code': bgCode,
    'bg-inline-code': bgInlineCode,
    'bg-hover': bgHover,
    'bg-active': bgActive,
    'overlay-dim': alpha('#000000', light ? 0.4 : 0.6),
    'text-primary': textPrimary,
    'text-heading': textHeading,
    'text-secondary': textSecondary,
    'text-muted': textMuted,
    'text-link': textLink,
    'text-on-accent': textOnAccent,
    'text-on-user-msg': textOnUserMsg,
    'border-subtle': borderSubtle,
    'border-strong': borderStrong,
    'focus-ring': alpha(accent, 0.6),
    accent,
    'accent-hover': accentHover,
    'accent-soft': accentSoft,
    danger,
    warning,
    success,
    ...syntaxPalette(accent, bgCode, ensureContrast(textMuted, bgCode, 3)),
    ...sidebar,
    shadow: alpha('#000000', light ? 0.12 : 0.5),
    scrim: alpha(bg, 0.8),
    skeleton: raise(bg, textPrimary, 0.09, LAYER.skeleton, light),
    'toggle-off': raise(bg, textPrimary, 0.3, LAYER.borderStrong, light),
    badge: accentSoft,
    tooltip: textPrimary,
    'diff-add': distinct(mix(bg, success, 0.14), bg, LAYER.hover, light ? 'darker' : 'lighter'),
    'diff-remove': distinct(mix(bg, danger, 0.14), bg, LAYER.hover, light ? 'darker' : 'lighter'),
  };

  return { tokens, notes, isLight: light, seeds: { bg: seeds.bg, accent: seeds.accent, sidebar: seeds.sidebar || null } };
}

export function toCssVars(tokens, prefix = '--ilook-') {
  return Object.entries(tokens)
    .map(([k, v]) => `${prefix}${k}: ${v};`)
    .join('\n');
}
