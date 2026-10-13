# I Look · 인수인계

ChatGPT·Claude 화면 색을 바꾸는 크롬 확장. 이 문서는 "지금 어디까지 됐고, 어떻게 확인하며, 무엇이 남았나"를 적는다.
2026-10-14 기준.

## 지금 상태

| 영역 | 상태 | 위치 |
| --- | --- | --- |
| 색 엔진 (시드 3색 → 토큰 48개, 모든 면 위 대비 보장) | 완성, 테스트 통과 | `src/engine/` |
| 추천 테마 24개 시드 | 완성 | `src/themes/presets.js` |
| 콘텐츠 스크립트 (캐시 선주입, storage 동기화, 미리보기, 프레임 주입) | 완성, 실기기 검증 (번쩍임 0, 캐시 복구) | `src/content/`, `src/background.js` |
| 팝업 (사이트 탭, 현재 상태, 목록·편집·설정, 언어 ko/en, 테마 공유 코드) | 완성 | `src/popup/` (`popup.js` 상태 / `views.js` 렌더 / `i18n.js` 문자열) |
| 사이트 어댑터 CSS | **실측 기반 완성** (아래 "구역" 참고) | `src/adapters/` |
| 빌드 | esbuild, `npm run build` → `dist/extension` | `tools/build-ext.mjs` |
| 테스트 | `npm test` (엔진·대비·저장·i18n·사이트 감지) | `test/` |

## 크롬에 로드하기

```
npm install
npm run build
```

크롬 → `chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램을 로드합니다" → `dist/extension`.
코드를 고친 뒤에는 `npm run build` → 확장 카드 ↻ → 사이트 탭 새로고침. **확장을 로드하기 전에 열려 있던 탭에는 주입되지 않으니 꼭 새로고침한다.**

## 동작 원리

- `document_start`에 `localStorage['ilook:css']`를 동기로 읽어 `<style id="ilook-tokens">`와 `html[data-ilook="light|dark"]`를 바로 넣는다. 이어서 `chrome.storage.sync`로 갱신하고 캐시를 다시 쓴다. 사이트가 속성이나 style을 지우면 `MutationObserver`가 다시 붙인다.
- 토큰은 세 형태로 주입된다: `--ilook-bg-app: #hex`, `--ilook-bg-app-hsl: H S% L%`(Claude 옛 변수용), `--ilook-bg-app-rgb: r g b`.
- `data-ilook` 값이 테마 밝기라서 어댑터가 사이트의 라이트/다크 스위치를 테마에 맞춰 고정한다.
- 팝업에서 색을 움직이면 `ilook:preview` 메시지로 열린 탭에 즉시 반영하고, 저장 전엔 storage에 쓰지 않는다.
- OFF는 `data-ilook` 속성 제거.
- 테마는 항상 사이트별(`activeTheme.chatgpt / claude`). Claude Code 웹은 Claude 테마를 따른다. 옛 저장값(`perSite`, `claude-code` 키)은 `storage.js`가 자동 이행한다.
- 팝업 언어는 `lang: auto|ko|en`. `chrome.i18n`은 브라우저 언어에 고정이라 `_locales/*/messages.json`을 팝업이 직접 읽는다.

### 프레임 주입 (Claude 문서·아티팩트)

Claude 문서 패널은 세 겹 iframe이다: `claude.ai/code/artifact/…` → `*.frame.claudeusercontent.com` → `sandbox="allow-scripts"` srcdoc.
앞 두 겹은 manifest `all_frames`로 들어가고, origin이 `null`인 srcdoc은 content_scripts로 안 들어가서 `background.js`가 `webNavigation.onCommitted`에서 `scripting` API로 직접 넣는다. 프레임 안에서는 `document.baseURI`로 사이트를 판별한다.

## 사이트별 구역 → 변수 (실측 확정)

### ChatGPT — 두 셸이 공존한다

| 셸 | 판별 | 토큰 체계 | 어댑터 블록 |
| --- | --- | --- | --- |
| 옛 셸 | `html.light` / `html.dark` | `--text-primary`, `--bg-primary`, `--main-surface-primary`, `--component-sidebar-bg`, `--theme-user-msg-bg` … (`html, .light, .dark .light` / `.dark`에 선언, 마크다운 본문 div가 `.light/.dark`를 직접 달고 재선언) | `html[data-ilook], .light, .dark, .popover, [data-chat-theme]` |
| 새 셸 (점진 배포 중) | `html.chatgpt-theme[data-theme]` | 전역 `--color-*`, `--app-color-*` (팔레트 `--gray-N`, `data-theme=dark`면 램프 반전). 캔버스·이미지 답변은 같은 체계의 puik 렌더러(`.puik-root[data-theme]`) | `html[data-ilook], [data-theme], .puik-root` + 사이드바 `.app-shell-left-panel` |

공통: 다크 모드에서 `html.dark :not(:where(.light, .light *))`가 모든 요소에 `--main-surface-primary`를 검정으로 재선언하므로 이 변수만 `*`에서 덮는다. Tailwind `@layer` 안의 `!important`(`bg-[#303030]!` 등)는 이길 수 없어 `background-image`로 그 위에 그린다. 코드 하이라이트 `.hljs-*`는 하드코딩 rgb라 `syntax-*` 토큰으로 바꾼다(`adapters/syntax.css`, 두 사이트 공용).

### Claude

- 화면은 새 CDS 변수(`--cds-*`, hex)가 칠한다. `.cds-root`(html + 중첩 13개)와 `[data-mode="dark"] .cds-root`에 선언되므로 둘 다 덮는다. 모드 상대 회색 단계 `--cds-neutral-N`(0=종이, 900=잉크)은 쓰이는 단계만 연결.
- 옛 변수(`--bg-*`, `--text-*`, `H S% L%` 형식)는 `--border-100`, `--accent-100` 등 일부가 아직 쓰여서 `-hsl` 토큰으로 유지.
- 사이드바(`.dframe-sidebar`)는 본문과 같은 `--cds-text-*`를 쓰고 배경을 surface-0/1 혼합으로 만들므로 사이드바 전용 토큰으로 바꿔 끼운다.
- 문서 편집기(`html[data-embedded]` / 독립형 `html[data-frame-uuid]`)는 `--bg/--fg/--mut/--surf/--line/--hov …` 자체 변수.
- 코드 블록 `.code-block__code`는 `canvastext`·인라인 색이라 직접 덮고, 중첩 범위의 `color-scheme`도 테마에 맞춘다.

## 검증 방법 (중요)

로그아웃 화면은 로그인 앱과 **다른 번들**이라 검증 가치가 없다. Playwright가 띄운 브라우저는 로그인이 막힌다. 그래서:

1. 사용자가 진짜 크롬을 별도 프로필 + 디버깅 포트로 띄운다.
   `open -na "Google Chrome" --args --user-data-dir="$HOME/ilook-chrome" --remote-debugging-port=9222 https://claude.ai https://chatgpt.com chrome://extensions`
   거기서 로그인하고 `dist/extension`을 손으로 로드한다 (Chrome 137+는 `--load-extension` 불가).
2. `playwright-core`의 `connectOverCDP('http://localhost:9222')`로 붙어 탭에서 JS를 실행한다. 확장 재로드는 `chrome://extensions` 탭에서 `chrome.developerPrivate.reload(id)`, 그 뒤 사이트 탭 새로고침.
3. 요소 단위 검사: 화면의 모든 요소에 대해 color / background-color / background-image / border / box-shadow가 `--ilook-*` 토큰값인지, 글자 대비가 3:1 이상인지 모아 "구역 | 속성 | 잔존색 | 출처 변수@셀렉터"로 출력한다. 잔존이 나오면 그 변수의 선언 위치(`:where(:root)`, `.dark`, 중첩 범위, 인라인, `@layer` !important)를 보고 덮는 방식을 정한다.
4. 상태 드라이버: 메뉴·모달·사이드바 접힘·좁은 창·각 페이지를 자동으로 열고 3을 돌린다. 계정 기능(캔버스·이미지·음성·아티팩트)은 그 창에서 사람이 열어 두면 된다.

`measure/ilook-measure.js`(콘솔 붙여넣기용)는 같은 검사를 수동으로 할 때 쓴다.

## 남은 작업

1. 팝업: 테마 공유 코드 — 완료 (`src/popup/share.js`, 형식 `ilook1/<배경>/<포인트>/<사이드바|->/<이름>`)
2. 출시 전 상표 검토 — 완료: Notion 시리즈는 Mood(Daybreak…Ember)로 개명, 설명에 무관 고지, 출처 페이지에 참고 표기
3. 상위 폴더 `I-LOOK2/`의 10월 8일자 옛 빌드 파일 삭제
4. ChatGPT 새 셸이 전면 배포되면 옛 셸 블록 제거 검토
5. Claude Code 웹의 터미널 출력·diff 블록 (연결된 세션이 있어야 보임)

## 자주 쓸 명령

```
npm test              테스트 전체
npm run preview       dist/preview.html — 테마 토큰 미리보기
npm run build         확장 빌드
```
