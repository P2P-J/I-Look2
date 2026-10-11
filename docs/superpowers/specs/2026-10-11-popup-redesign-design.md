# 팝업 재설계 · 사이트별 테마 · 언어 전환

2026-10-11. 크롬 웹 스토어 공개(해외 사용자 포함)를 전제로 한 팝업 개편.

## 목표

1. 테마 바꾸기와 색 만들기가 가장 빠른 동선에 온다.
2. 지금 어떤 사이트에 어떤 테마가 켜져 있는지 열자마자 보인다.
3. 숨은 조작(더블클릭)이 없다. 모든 동작은 보이는 버튼으로 한다.
4. 사이트(ChatGPT / Claude)별로 다른 테마를 쓸 수 있다.
5. 팝업 언어를 앱 안에서 바꿀 수 있다 (한국어 / English, 기본 자동).

범위 밖: 테마 내보내기·가져오기(설정 화면에 자리만 둔다), 추가 언어.

## 화면

팝업 폭 360px. 상단·하단 고정, 가운데만 스크롤.

### ① 목록 (기본 화면)

| 영역 | 내용 |
| --- | --- |
| 상단 고정 | 아이콘 · 사이트 탭 `Claude \| ChatGPT` · ON/OFF 스위치 · ⚙ |
| 현재 상태 줄 | 미니 미리보기 · 테마 이름 · "{사이트}에 적용 중" · **색 바꾸기** 버튼 |
| 필터 칩 | `전체 / 라이트 / 다크 / 내 테마` |
| 카드 그리드 | 2열. 누르면 **현재 탭의 사이트**에 즉시 적용. 적용 중인 카드는 테두리 강조 |
| 하단 고정 | 안내 한 줄("누르면 {사이트}에 바로 적용") · `+ 내 테마 만들기` |

- 사이트 탭은 팝업을 연 탭의 사이트로 자동 선택된다. 두 사이트가 아닌 탭에서 열면 마지막에 쓴 탭(기본 Claude).
- ON/OFF는 전체 스위치 하나(사이트별 아님).
- 카드 클릭 외의 조작(더블클릭·롱프레스)은 없다. 내 테마 카드에는 작은 "편집" 글자 버튼이 보인다.

### ② 편집

진입: 현재 상태 줄의 **색 바꾸기**, `+ 내 테마 만들기`, 내 테마 카드의 "편집".

- "색 바꾸기"를 프리셋에서 누르면 프리셋을 복사한 내 테마("{이름} 변형")를 편집한다. 저장하면 내 테마로 추가되고 현재 사이트에 적용된다.
- 구성: `‹ 목록` · 제목 · 이름 입력 · 큰 미리보기 · 배경/포인트/사이드바 색(컬러 피커 + hex) · "배경에서 자동으로" 체크(사이드바) · 안내 줄 · 🎲 랜덤 · 삭제(내 테마만) · 저장.
- 편집 중 색 변화는 열린 사이트 탭에 실시간 미리보기(기존 `ilook:preview` 메시지 그대로). 목록으로 돌아가면 미리보기 종료.
- 엔진 안내(배경 밝기 조정 등)는 안내 줄 아래 작은 글로 표시.

### ③ 설정 (⚙)

같은 창 안에서 목록 위로 전환. `‹ 목록`으로 복귀.

| 항목 | 동작 |
| --- | --- |
| 언어 `자동 / 한국어 / English` | 즉시 팝업 전체 문자열 교체 |
| 두 사이트 같은 테마 쓰기 | 현재 탭 사이트의 테마를 다른 사이트에도 적용. 부제에 "지금 {사이트}의 {테마}를 {다른 사이트}에도" |
| 색상 출처 | about.html 새 탭 |
| 버전 | manifest version 표시 |

## 저장 구조

```
{
  enabled: true,
  activeTheme: { chatgpt: 'notion-blue-light', claude: 'notion-blue-light' },
  customThemes: [ { id, name, seeds: { bg, accent, sidebar? } } ],
  lang: 'auto' | 'ko' | 'en',
  lastSite: 'chatgpt' | 'claude'
}
```

- `perSite`는 없앤다. 항상 사이트별.
- `claude-code` 키는 없앤다. 콘텐츠 스크립트가 `claude-code` 사이트를 감지하면 `claude` 테마를 쓴다.
- 이행: `withDefaults`가 옛 저장값을 읽을 때 `activeTheme['claude-code']`를 버리고, `perSite`가 false였으면 `claude` 값을 `chatgpt`에도 복사한다(지금까지 공통 테마였으므로 보이는 결과가 바뀌지 않게).

`resolveSeeds(settings, site)`: `site === 'claude-code' → 'claude'` 로 키를 고른 뒤 `activeTheme[key]`.

## 언어(i18n)

- 문자열은 전부 `src/_locales/{en,ko}/messages.json`. 키는 `popup_*` 접두어(스토어용 `appName`, `appDesc`는 유지).
- `src/popup/i18n.js`: `load(lang)`이 `chrome.runtime.getURL('_locales/<lang>/messages.json')`을 fetch해 사전을 만들고, `t(key, subs)`로 꺼낸다. `apply(root)`가 `[data-i18n]`(textContent), `[data-i18n-title]`, `[data-i18n-placeholder]` 요소를 채운다. 동적으로 만드는 문자열(카드 라벨, "{사이트}에 적용 중")은 JS에서 `t()`로 만든다.
- `auto`: `chrome.i18n.getUILanguage()`가 `ko`로 시작하면 `ko`, 아니면 `en`.
- `chrome.i18n.getMessage`는 쓰지 않는다(브라우저 언어에 고정되어 앱 안 전환이 안 된다). manifest `default_locale`은 `en`으로 바꾼다.
- 엔진 `derive()`의 `notes`는 한국어 문장 대신 코드 배열을 돌려준다: `bg-adjusted`, `bg-saturated`, `accent-adjusted`, `accent-text-adjusted`. 팝업이 `popup_note_<code>`로 번역한다. 기존 테스트는 코드 기준으로 바꾼다.
- 프리셋 이름은 고유명사라 번역하지 않는다. 시리즈 라벨(`Notion`, `Radix`, `Editor`)도 그대로. "내 테마" 기본 이름만 번역.

## 코드 구성

```
src/popup/
  popup.html      세 화면의 마크업(한 파일, hidden 전환). 문자열은 data-i18n
  popup.css
  popup.js        상태(settings, site, view, editing), 이벤트 바인딩, 저장 호출
  views.js        renderList / renderEditor / renderSettings — 순수 DOM 렌더
  i18n.js         load / t / apply
src/storage.js    DEFAULT_SETTINGS·withDefaults 이행·resolveSeeds 변경
src/engine/derive.js  notes를 코드로
src/manifest.json default_locale: en
```

- `views.js`는 `settings`와 `t`를 받아 DOM만 만든다. 저장·메시지는 `popup.js`가 한다.
- 콘텐츠 스크립트는 바뀌는 게 없다(`resolveSeeds` 내부만).

## 검증

- `test/storage.test.mjs`: `resolveSeeds`가 사이트별 키를 쓰는지, `claude-code → claude`, 옛 저장값 이행(perSite false → 양쪽 같은 테마, `claude-code` 키 제거).
- `test/i18n.test.mjs`: ko·en messages.json의 키 집합이 같고, 팝업 HTML의 `data-i18n*` 키가 모두 존재한다. `i18n.js`의 치환 로직(`{site}` 같은 자리표시자).
- `test/engine.test.mjs`: notes가 코드로 나오는지.
- 팝업 화면은 디버그 크롬(`~/ilook-chrome`, 9222)에서 세 화면 × 두 언어 스크린샷으로 확인한다.
