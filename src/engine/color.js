export function parseHex(hex) {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) throw new Error(`잘못된 hex: ${hex}`);
  const n = parseInt(h.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toHex({ r, g, b }) {
  const c = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return c * 255;
}

export function luminance(rgb) {
  return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function rgbToOklab(rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToRgb({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function rgbToOklch(rgb) {
  const { L, a, b } = rgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H: C < 1e-6 ? 0 : H };
}

export function oklchToRgb({ L, C, H }) {
  const rad = (H * Math.PI) / 180;
  return oklabToRgb({ L, a: C * Math.cos(rad), b: C * Math.sin(rad) });
}

function inGamut(rgb) {
  return rgb.r >= -0.5 && rgb.r <= 255.5 && rgb.g >= -0.5 && rgb.g <= 255.5 && rgb.b >= -0.5 && rgb.b <= 255.5;
}

export function oklchToHex(lch) {
  let c = lch.C;
  let rgb = oklchToRgb({ ...lch, C: c });
  let guard = 0;
  while (!inGamut(rgb) && c > 0.0005 && guard < 40) {
    c *= 0.85;
    rgb = oklchToRgb({ ...lch, C: c });
    guard++;
  }
  return toHex(rgb);
}

export function hexToOklch(hex) {
  return rgbToOklch(parseHex(hex));
}

export function contrastHex(a, b) {
  return contrast(parseHex(a), parseHex(b));
}

export function isLight(hex) {
  return luminance(parseHex(hex)) >= 0.18;
}

export function mix(hexA, hexB, t) {
  const a = rgbToOklab(parseHex(hexA));
  const b = rgbToOklab(parseHex(hexB));
  return toHex(
    oklabToRgb({
      L: a.L + (b.L - a.L) * t,
      a: a.a + (b.a - a.a) * t,
      b: a.b + (b.b - a.b) * t,
    })
  );
}

export function shiftL(hex, dL, opts = {}) {
  const lch = hexToOklch(hex);
  const C = opts.C !== undefined ? opts.C : lch.C;
  return oklchToHex({ L: clamp(lch.L + dL, 0, 1), C, H: lch.H });
}

export function withChroma(hex, C) {
  const lch = hexToOklch(hex);
  return oklchToHex({ ...lch, C });
}

export function ensureContrast(fgHex, bgHex, minRatio, opts = {}) {
  const bg = parseHex(bgHex);
  const fg = hexToOklch(fgHex);
  const start = contrast(parseHex(fgHex), bg);
  if (start >= minRatio) return fgHex;

  const direction = opts.direction || (isLight(bgHex) ? 'darker' : 'lighter');
  const step = direction === 'darker' ? -0.01 : 0.01;
  let L = fg.L;
  let best = fgHex;
  let bestRatio = start;
  for (let i = 0; i < 120; i++) {
    L = clamp(L + step, 0, 1);
    const hex = oklchToHex({ L, C: fg.C, H: fg.H });
    const ratio = contrast(parseHex(hex), bg);
    if (ratio > bestRatio) {
      best = hex;
      bestRatio = ratio;
    }
    if (ratio >= minRatio) return hex;
    if (L <= 0 || L >= 1) break;
  }

  const other = direction === 'darker' ? 'lighter' : 'darker';
  if (!opts._second) {
    const alt = ensureContrast(fgHex, bgHex, minRatio, { direction: other, _second: true });
    if (contrast(parseHex(alt), bg) > bestRatio) return alt;
  }
  return best;
}

export function distinct(hex, bgHex, minRatio, preferred) {
  if (contrastHex(hex, bgHex) >= minRatio) return hex;
  const dir = preferred || (isLight(bgHex) ? 'darker' : 'lighter');
  const first = ensureContrast(hex, bgHex, minRatio, { direction: dir, _second: true });
  if (contrastHex(first, bgHex) >= minRatio) return first;
  return ensureContrast(hex, bgHex, minRatio, { direction: dir === 'darker' ? 'lighter' : 'darker', _second: true });
}

export function targetContrast(fgHex, bgHex, targetRatio, minRatio, opts = {}) {
  const hit = ensureContrast(fgHex, bgHex, targetRatio, opts);
  if (contrastHex(hit, bgHex) >= targetRatio) return hit;
  return ensureContrast(fgHex, bgHex, minRatio, opts);
}

export function textOn(bgHex, targetRatio = 7, minRatio = 4.5) {
  const bg = hexToOklch(bgHex);
  const light = isLight(bgHex);
  const seed = oklchToHex({ L: light ? 0.25 : 0.93, C: Math.min(bg.C * 0.25, 0.02), H: bg.H });
  return targetContrast(seed, bgHex, targetRatio, minRatio, { direction: light ? 'darker' : 'lighter' });
}

export function bestOf(candidates, bgHex) {
  let best = candidates[0];
  let bestRatio = -1;
  for (const c of candidates) {
    const r = contrastHex(c, bgHex);
    if (r > bestRatio) {
      best = c;
      bestRatio = r;
    }
  }
  return best;
}

export function hslTriple(hex) {
  const { r, g, b } = parseHex(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  const f = (v) => Math.round(v * 10) / 10;
  return `${f(h)} ${f(s * 100)}% ${f(l * 100)}%`;
}

export function rgbTriple(hex) {
  const { r, g, b } = parseHex(hex);
  return `${r} ${g} ${b}`;
}

export function alpha(hex, a) {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
