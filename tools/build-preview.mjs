import { writeFileSync } from 'node:fs';
import { derive } from '../src/engine/derive.js';
import { contrastHex } from '../src/engine/color.js';

const SEEDS = [
  ['Notion Blue (Light)', { bg: '#e9f3f7', accent: '#337ea9' }],
  ['Notion Green (Light)', { bg: '#eef3ed', accent: '#448361' }],
  ['Notion Purple (Light)', { bg: '#f6f3f8', accent: '#9065b0' }],
  ['Notion Pink (Light)', { bg: '#f9f2f5', accent: '#c14c8a' }],
  ['Notion Blue (Dark)', { bg: '#1f282d', accent: '#2e7cd1' }],
  ['Notion Purple (Dark)', { bg: '#2a2430', accent: '#8d5bc1' }],
  ['Catppuccin Latte', { bg: '#eff1f5', accent: '#8839ef', sidebar: '#e6e9ef' }],
  ['Catppuccin Mocha', { bg: '#1e1e2e', accent: '#cba6f7', sidebar: '#181825' }],
  ['Nord Dark', { bg: '#2e3440', accent: '#88c0d0' }],
  ['Rosé Pine Dawn', { bg: '#faf4ed', accent: '#d7827e', sidebar: '#fffaf3' }],
  ['Dracula', { bg: '#282a36', accent: '#bd93f9' }],
  ['순흑 (극단)', { bg: '#000000', accent: '#2e7cd1' }],
  ['순백 (극단)', { bg: '#ffffff', accent: '#2e7cd1' }],
  ['중간 회색 (극단)', { bg: '#767676', accent: '#2e7cd1' }],
  ['형광 핑크 (극단)', { bg: '#ff00aa', accent: '#00ffcc' }],
  ['밝은 본문 + 어두운 사이드바', { bg: '#f5f5f5', accent: '#d97757', sidebar: '#1a1a1a' }],
];

function card(name, result) {
  const t = result.tokens;
  const v = Object.entries(t).map(([k, val]) => `--${k}:${val}`).join(';');
  const cr = (a, b) => contrastHex(t[a], t[b]).toFixed(1);
  const notes = result.notes.length ? `<div class="notes">${result.notes.map((n) => `<span>${n}</span>`).join('')}</div>` : '';
  return `
<section class="theme" style="${v}">
  <header class="theme-head"><strong>${name}</strong><code>${result.seeds.bg} · ${result.seeds.accent}${result.seeds.sidebar ? ' · ' + result.seeds.sidebar : ''}</code></header>
  ${notes}
  <div class="app">
    <aside class="sidebar">
      <div class="sb-top"><span class="sb-logo"></span> 새 채팅</div>
      <div class="sb-section">오늘</div>
      <div class="sb-item active">선택된 대화</div>
      <div class="sb-item hover">마우스 올린 대화</div>
      <div class="sb-item">일반 대화</div>
      <div class="sb-item">또 다른 대화</div>
      <div class="sb-muted">텍스트 대비 ${cr('sidebar-text', 'bg-sidebar')} · 보조 ${cr('sidebar-text-muted', 'bg-sidebar')}</div>
      <div class="sb-badge">PRO</div>
    </aside>
    <main class="main">
      <div class="user-msg">사용자 말풍선입니다. 글자 대비 ${cr('text-on-user-msg', 'bg-user-msg')}</div>
      <div class="ai">
        <h3>제목 글자 (${cr('text-heading', 'bg-app')})</h3>
        <p>본문 글자입니다. 대비 ${cr('text-primary', 'bg-app')}. <a>링크 ${cr('text-link', 'bg-app')}</a>와 <code class="inline">인라인 코드</code>가 들어갑니다.</p>
        <p class="secondary">보조 글자 ${cr('text-secondary', 'bg-app')}</p>
        <p class="muted">흐린 글자 ${cr('text-muted', 'bg-app')} · 액션 바 아이콘 색</p>
        <blockquote>인용문 영역</blockquote>
        <pre class="code"><span class="kw">const</span> <span class="fn">derive</span> = (<span class="prop">seeds</span>) =&gt; <span class="str">"tokens"</span>; <span class="num">48</span> <span class="cm">// 주석</span></pre>
        <table><tr><th>표 헤더</th><th>헤더</th></tr><tr><td>셀</td><td>셀</td></tr><tr class="stripe"><td>줄무늬</td><td>셀</td></tr></table>
        <div class="diff"><div class="add">+ 추가된 줄</div><div class="rm">- 삭제된 줄</div></div>
        <div class="status"><span class="danger">에러</span><span class="warning">경고</span><span class="success">성공</span></div>
      </div>
      <div class="composer">
        <span class="placeholder">메시지를 입력하세요…</span>
        <button class="send">전송 ${cr('text-on-accent', 'accent')}</button>
      </div>
    </main>
    <div class="menu"><div class="mi">메뉴 항목</div><div class="mi hover">hover 항목</div><div class="sep"></div><div class="mi muted">설명 글자</div></div>
    <div class="tooltip">툴팁</div>
  </div>
</section>`;
}

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>ILOOK 엔진 미리보기</title>
<style>
  body{margin:0;padding:24px;background:#111;color:#ddd;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
  h1{font-size:18px;margin:0 0 4px}
  .lead{color:#999;margin:0 0 20px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(560px,1fr));gap:20px}
  .theme{border-radius:12px;overflow:hidden;border:1px solid #333;background:var(--bg-app)}
  .theme-head{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#1a1a1a;color:#ddd;font-size:12px}
  .theme-head code{color:#888}
  .notes{padding:6px 12px;background:#2a2410;color:#f0c060;font-size:11px;display:flex;gap:10px;flex-wrap:wrap}
  .app{position:relative;display:grid;grid-template-columns:150px 1fr;min-height:360px;background:var(--bg-app);color:var(--text-primary)}
  .sidebar{background:var(--bg-sidebar);color:var(--sidebar-text);padding:10px;border-right:1px solid var(--sidebar-border);font-size:12px}
  .sb-top{display:flex;align-items:center;gap:6px;margin-bottom:10px;font-weight:600}
  .sb-logo{width:14px;height:14px;border-radius:4px;background:var(--accent)}
  .sb-section{color:var(--sidebar-text-muted);font-size:11px;margin:8px 0 4px}
  .sb-item{padding:5px 8px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sb-item.active{background:var(--sidebar-active)}
  .sb-item.hover{background:var(--sidebar-hover)}
  .sb-muted{color:var(--sidebar-text-muted);font-size:10px;margin-top:12px}
  .sb-badge{display:inline-block;margin-top:8px;padding:1px 6px;border-radius:4px;background:var(--badge);color:var(--sidebar-accent);font-size:10px;font-weight:700}
  .main{padding:14px 16px 12px;display:flex;flex-direction:column;gap:10px;font-size:13px}
  .user-msg{align-self:flex-end;max-width:70%;background:var(--bg-user-msg);color:var(--text-on-user-msg);padding:8px 12px;border-radius:12px}
  .ai h3{margin:0 0 4px;color:var(--text-heading);font-size:15px}
  .ai p{margin:4px 0}
  .ai a{color:var(--text-link);text-decoration:underline;text-decoration-color:var(--text-link)}
  .secondary{color:var(--text-secondary)}
  .muted{color:var(--text-muted)}
  .inline{background:var(--bg-inline-code);padding:1px 5px;border-radius:4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
  blockquote{margin:6px 0;padding:4px 10px;border-left:3px solid var(--border-strong);color:var(--text-secondary)}
  .code{margin:6px 0;padding:10px;border-radius:8px;background:var(--bg-code);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;overflow:auto}
  .kw{color:var(--syntax-keyword)}.fn{color:var(--syntax-function)}.str{color:var(--syntax-string)}.num{color:var(--syntax-number)}.cm{color:var(--syntax-comment)}.prop{color:var(--syntax-property)}
  table{border-collapse:collapse;font-size:12px;margin:6px 0}
  th,td{border:1px solid var(--border-subtle);padding:4px 10px}
  th{background:var(--bg-surface);color:var(--text-heading)}
  tr.stripe td{background:var(--bg-hover)}
  .diff{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;border-radius:6px;overflow:hidden;border:1px solid var(--border-subtle)}
  .diff .add{background:var(--diff-add);padding:2px 8px;color:var(--text-primary)}
  .diff .rm{background:var(--diff-remove);padding:2px 8px;color:var(--text-primary)}
  .status{display:flex;gap:10px;font-size:12px;font-weight:600}
  .danger{color:var(--danger)}.warning{color:var(--warning)}.success{color:var(--success)}
  .composer{margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:12px;padding:10px 12px;box-shadow:0 2px 8px var(--shadow)}
  .placeholder{color:var(--text-muted)}
  .send{background:var(--accent);color:var(--text-on-accent);border:0;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer}
  .send:hover{background:var(--accent-hover)}
  .menu{position:absolute;right:16px;top:14px;width:150px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:10px;padding:6px;box-shadow:0 8px 24px var(--shadow);font-size:12px}
  .mi{padding:5px 8px;border-radius:6px}.mi.hover{background:var(--bg-hover)}.sep{height:1px;background:var(--border-subtle);margin:4px 0}
  .tooltip{position:absolute;right:16px;bottom:70px;background:var(--tooltip);color:var(--bg-app);padding:4px 8px;border-radius:6px;font-size:11px}
</style></head><body>
<h1>ILOOK 색 엔진 미리보기</h1>
<p class="lead">시드 2~3색에서 자동 계산된 토큰 48개. 괄호 숫자는 WCAG 대비. 노란 띠는 엔진이 사용자에게 띄울 안내 문구.</p>
<div class="grid">
${SEEDS.map(([n, s]) => card(n, derive(s))).join('\n')}
</div>
</body></html>`;

writeFileSync(new URL('../dist/preview.html', import.meta.url), html);
console.log('dist/preview.html 생성, 테마', SEEDS.length, '개');
