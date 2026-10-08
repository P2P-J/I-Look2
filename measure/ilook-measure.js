(() => {
  const COLOR_PROPS = [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'caret-color',
    'text-decoration-color',
    'accent-color',
    'fill',
    'stroke',
    'column-rule-color',
  ];
  const COMPLEX_PROPS = ['background-image', 'box-shadow', 'text-shadow'];
  const PSEUDOS = ['', '::before', '::after', '::placeholder', '::marker', '::selection'];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE']);
  const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|color\([^)]*\)|\b(?:transparent|currentcolor|white|black)\b/gi;
  const HSL_TRIPLE_RE = /^\s*\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%\s*$/;

  function isTransparent(v) {
    if (!v) return true;
    const s = v.trim().toLowerCase();
    if (s === 'transparent' || s === 'none' || s === 'currentcolor') return true;
    const m = s.match(/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*([\d.]+))?\s*\)$/);
    if (m && m[1] !== undefined && parseFloat(m[1]) === 0) return true;
    const m2 = s.match(/^(?:rgb|hsl|oklch|oklab|color)\([^/]*\/\s*0(?:\.0+)?\s*\)$/);
    if (m2) return true;
    return false;
  }

  function normalizeColor(v) {
    return v.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function describe(el) {
    const parts = [el.tagName.toLowerCase()];
    const tid = el.getAttribute('data-testid');
    const aria = el.getAttribute('aria-label');
    const role = el.getAttribute('role');
    if (el.id) parts.push('#' + el.id);
    if (tid) parts.push(`[data-testid="${tid}"]`);
    if (role) parts.push(`[role="${role}"]`);
    if (aria) parts.push(`[aria-label="${aria.slice(0, 40)}"]`);
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    if (cls.length) parts.push('.' + cls.slice(0, 3).join('.'));
    return parts.join('');
  }

  function pathOf(el) {
    const chain = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && depth < 6) {
      const tid = cur.getAttribute('data-testid');
      const role = cur.getAttribute('role');
      const aria = cur.getAttribute('aria-label');
      let label = cur.tagName.toLowerCase();
      if (cur.id) label += '#' + cur.id;
      else if (tid) label += `[data-testid=${tid}]`;
      else if (role) label += `[role=${role}]`;
      else if (aria) label += `[aria-label=${aria.slice(0, 20)}]`;
      chain.unshift(label);
      cur = cur.parentElement;
      depth++;
    }
    return chain.join(' > ');
  }

  function region(el) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return 'hidden';
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < vw * 0.22 && r.height > vh * 0.3) return 'sidebar?';
    if (cy < vh * 0.1) return 'top';
    if (cy > vh * 0.82) return 'bottom';
    return 'main';
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }

  function* walk(root) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let n = tw.currentNode;
    while (n) {
      if (n.nodeType === 1) {
        yield n;
        if (n.shadowRoot) yield* walk(n.shadowRoot);
      }
      n = tw.nextNode();
    }
  }

  function collectComputed() {
    const colors = new Map();
    let scanned = 0;
    const add = (color, prop, el, pseudo) => {
      const key = normalizeColor(color);
      let rec = colors.get(key);
      if (!rec) {
        rec = { color: key, count: 0, props: {}, regions: {}, examples: [] };
        colors.set(key, rec);
      }
      rec.count++;
      const pkey = prop + (pseudo || '');
      rec.props[pkey] = (rec.props[pkey] || 0) + 1;
      const rg = region(el);
      rec.regions[rg] = (rec.regions[rg] || 0) + 1;
      if (rec.examples.length < 4 && visible(el)) {
        const d = describe(el);
        if (!rec.examples.some((e) => e.el === d)) {
          rec.examples.push({ el: d, path: pathOf(el), prop: pkey, region: rg });
        }
      }
    };

    for (const el of walk(document.documentElement)) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      scanned++;
      const inSvg = !!el.closest('svg');
      for (const pseudo of PSEUDOS) {
        let cs;
        try {
          cs = getComputedStyle(el, pseudo || null);
        } catch (e) {
          continue;
        }
        if ((pseudo === '::before' || pseudo === '::after') && (cs.content === 'none' || cs.content === '')) continue;
        for (const p of COLOR_PROPS) {
          if ((p === 'fill' || p === 'stroke') && !inSvg) continue;
          const v = cs.getPropertyValue(p);
          if (!v || isTransparent(v)) continue;
          add(v, p, el, pseudo);
        }
        for (const p of COMPLEX_PROPS) {
          const v = cs.getPropertyValue(p);
          if (!v || v === 'none') continue;
          const found = v.match(COLOR_RE) || [];
          for (const c of found) {
            if (isTransparent(c)) continue;
            add(c, p, el, pseudo);
          }
        }
      }
    }
    const list = [...colors.values()].sort((a, b) => b.count - a.count);
    return { scanned, uniqueColors: list.length, colors: list };
  }

  function collectStylesheets() {
    const customProps = new Map();
    const literalRules = [];
    const blocked = [];
    let ruleCount = 0;

    const visit = (rules, sheetHref) => {
      for (const rule of rules) {
        ruleCount++;
        if (!(rule instanceof CSSStyleRule)) {
          if (rule.cssRules && rule.cssRules.length) visit(rule.cssRules, sheetHref);
          continue;
        }
        const style = rule.style;
        const sel = rule.selectorText || '';
        for (let i = 0; i < style.length; i++) {
          const name = style[i];
          const value = style.getPropertyValue(name).trim();
          if (name.startsWith('--')) {
            const looksColor = COLOR_RE.test(value) || HSL_TRIPLE_RE.test(value);
            COLOR_RE.lastIndex = 0;
            if (!looksColor) continue;
            let rec = customProps.get(name);
            if (!rec) {
              rec = { name, declarations: [] };
              customProps.set(name, rec);
            }
            if (rec.declarations.length < 6) rec.declarations.push({ selector: sel.slice(0, 120), value: value.slice(0, 80) });
          } else if (/color|background|border|shadow|fill|stroke|outline/.test(name)) {
            if (value.includes('var(')) continue;
            const found = value.match(COLOR_RE);
            COLOR_RE.lastIndex = 0;
            if (!found) continue;
            if (found.every((c) => isTransparent(c))) continue;
            if (literalRules.length < 400) literalRules.push({ selector: sel.slice(0, 160), prop: name, value: value.slice(0, 80), sheet: sheetHref });
          }
        }
        if (rule.cssRules && rule.cssRules.length) visit(rule.cssRules, sheetHref);
      }
    };

    for (const sheet of document.styleSheets) {
      const href = sheet.href ? sheet.href.split('/').pop() : '(inline)';
      try {
        visit(sheet.cssRules, href);
      } catch (e) {
        blocked.push(sheet.href || '(inline)');
      }
    }

    const rootComputed = {};
    const rootStyle = getComputedStyle(document.documentElement);
    for (const name of customProps.keys()) {
      const v = rootStyle.getPropertyValue(name).trim();
      if (v) rootComputed[name] = v;
    }

    return {
      ruleCount,
      blockedSheets: blocked,
      customColorProps: [...customProps.values()],
      rootComputedValues: rootComputed,
      literalColorRules: literalRules,
      literalColorRuleCount: literalRules.length,
    };
  }

  function collectMode() {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlClass: html.className,
      htmlDataset: { ...html.dataset },
      bodyClass: body ? body.className : '',
      bodyDataset: body ? { ...body.dataset } : {},
      colorScheme: getComputedStyle(html).colorScheme,
      prefersDark: typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)').matches : null,
      ilookActive: html.hasAttribute('data-ilook'),
    };
  }

  function collectUnstylable() {
    const canvases = [...document.querySelectorAll('canvas')].filter(visible).map((c) => ({ el: describe(c), path: pathOf(c) }));
    const iframes = [...document.querySelectorAll('iframe')].filter(visible).map((f) => {
      let sameOrigin = false;
      try {
        sameOrigin = !!f.contentDocument;
      } catch (e) {
        sameOrigin = false;
      }
      return { el: describe(f), src: (f.src || '').slice(0, 100), sameOrigin };
    });
    const images = [...document.querySelectorAll('img')].filter(visible).length;
    return { canvases, iframes, imageCount: images };
  }

  function run(label) {
    const t0 = performance.now();
    const result = {
      tool: 'ilook-measure',
      version: '0.1.0',
      label: label || `${location.hostname}-${new Date().toISOString().slice(0, 19)}`,
      url: location.href,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      capturedAt: new Date().toISOString(),
      mode: collectMode(),
      computed: collectComputed(),
      stylesheets: collectStylesheets(),
      unstylable: collectUnstylable(),
    };
    result.elapsedMs = Math.round(performance.now() - t0);
    window.__ILOOK_LAST = result;
    summary(result);
    return result;
  }

  function summary(r) {
    r = r || window.__ILOOK_LAST;
    if (!r) return console.warn('먼저 __ILOOK.run() 을 실행하세요.');
    console.group(`%cILOOK 실측 · ${r.label}`, 'font-weight:bold;font-size:14px');
    console.log(`요소 ${r.computed.scanned}개 스캔, 고유 색 ${r.computed.uniqueColors}개, 스타일 규칙 ${r.stylesheets.ruleCount}개, 하드코딩 색 규칙 ${r.stylesheets.literalColorRuleCount}개, ${r.elapsedMs}ms`);
    console.log('모드 단서:', r.mode);
    if (r.stylesheets.blockedSheets.length) console.warn('읽지 못한 스타일시트(교차 출처):', r.stylesheets.blockedSheets);
    console.log('%c상위 30개 색', 'font-weight:bold');
    console.table(
      r.computed.colors.slice(0, 30).map((c) => ({
        color: c.color,
        count: c.count,
        props: Object.keys(c.props).slice(0, 4).join(', '),
        regions: Object.entries(c.regions).map(([k, v]) => `${k}:${v}`).join(' '),
        example: c.examples[0] ? c.examples[0].el : '',
      }))
    );
    console.log('%cCSS 변수(색 값) ' + r.stylesheets.customColorProps.length + '개', 'font-weight:bold');
    console.table(
      r.stylesheets.customColorProps.slice(0, 60).map((p) => ({
        name: p.name,
        root: r.stylesheets.rootComputedValues[p.name] || '',
        declaredIn: p.declarations.map((d) => d.selector).slice(0, 2).join(' | '),
      }))
    );
    if (r.unstylable.canvases.length || r.unstylable.iframes.length) {
      console.log('%c색을 바꾸기 어려운 요소', 'font-weight:bold', r.unstylable);
    }
    console.log('전체 JSON 받기: __ILOOK.download()   클립보드 복사: __ILOOK.copy()');
    console.groupEnd();
  }

  function download(r) {
    r = r || window.__ILOOK_LAST;
    if (!r) return console.warn('먼저 __ILOOK.run() 을 실행하세요.');
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ilook-${r.label.replace(/[^a-z0-9-_]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    console.log('다운로드:', a.download);
  }

  async function copy(r) {
    r = r || window.__ILOOK_LAST;
    if (!r) return console.warn('먼저 __ILOOK.run() 을 실행하세요.');
    const text = JSON.stringify(r);
    try {
      await navigator.clipboard.writeText(text);
      console.log(`클립보드에 복사됨 (${Math.round(text.length / 1024)}KB)`);
    } catch (e) {
      console.warn('클립보드 복사 실패. 대신 __ILOOK.download() 를 쓰세요.', e);
    }
  }

  function residual(baseline, current) {
    current = current || window.__ILOOK_LAST;
    if (!baseline || !current) return console.warn('residual(원본측정, 적용후측정) 두 결과가 필요합니다.');
    const before = new Set(baseline.computed.colors.map((c) => c.color));
    const left = current.computed.colors.filter((c) => before.has(c.color));
    console.group(`%c원래 색 잔존 검사 · ${left.length}개 남음`, 'font-weight:bold;font-size:14px');
    console.table(left.slice(0, 50).map((c) => ({ color: c.color, count: c.count, example: c.examples[0] ? c.examples[0].el : '', path: c.examples[0] ? c.examples[0].path : '' })));
    console.groupEnd();
    return left;
  }

  window.__ILOOK = { run, summary, download, copy, residual, version: '0.1.0' };
  console.log('%cILOOK 실측 도구 준비됨', 'font-weight:bold;color:#2E7CD1');
  console.log('사용법: __ILOOK.run("claude-dark-chat")  →  __ILOOK.download()');
  return window.__ILOOK;
})();
