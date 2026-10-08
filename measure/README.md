# ILOOK 실측 가이드

사이트가 실제로 쓰는 색을 전부 뽑아서 구역 맵 v1을 확정하기 위한 절차.

## 실행 방법

1. 측정할 화면을 띄운다 (아래 체크리스트 참고).
2. F12 → Console 탭.
3. `ilook-measure.js` 내용 전체를 붙여넣고 Enter. "ILOOK 실측 도구 준비됨"이 뜬다.
4. 라벨을 붙여 실행한다. 라벨은 `사이트-모드-화면` 형식.
   ```js
   __ILOOK.run("claude-dark-chat")
   ```
5. 콘솔에 요약 표가 뜬다. 전체 결과를 파일로 받는다.
   ```js
   __ILOOK.download()
   ```
   `ilook-claude-dark-chat.json`이 다운로드된다. 이 파일을 보내주면 된다.

같은 탭에서 다른 화면(메뉴 열기, 모달 띄우기)으로 바꾼 뒤 `__ILOOK.run("라벨")`만 다시 실행하면 된다. 스크립트를 다시 붙여넣을 필요 없다.

### 첫 실행 시 붙여넣기가 막히면

크롬이 "allow pasting"을 입력하라고 하면 그대로 `allow pasting`을 치고 Enter 후 다시 붙여넣는다.

## 측정 체크리스트

사이트 3곳 × 모드 2개. 각 모드에서 아래 화면을 띄우고 run 한다. 라벨 예시는 Claude 다크 기준.

| # | 화면 | 띄우는 법 | 라벨 |
| --- | --- | --- | --- |
| 1 | 새 채팅 첫 화면 | 새 채팅 열기 | `claude-dark-home` |
| 2 | 일반 대화 | 사이드바 펼친 상태로 아무 대화 열기 | `claude-dark-chat` |
| 3 | 마크다운 답변 | 코드 블록·표·인용·목록이 있는 답변 (없으면 하나 요청해서 만든다) | `claude-dark-markdown` |
| 4 | 웹 검색·사고 과정 | 검색 결과나 사고 과정이 보이는 답변 | `claude-dark-tools` |
| 5 | 첨부 상태 | 입력창에 파일 하나 첨부해 둔 상태 | `claude-dark-attach` |
| 6 | 메뉴 열림 | 모델 선택기나 ⋯ 메뉴를 연 상태 (닫히지 않게 주의) | `claude-dark-menu` |
| 7 | 모달 열림 | 공유 모달 등 | `claude-dark-modal` |
| 8 | 사이드바 접힘 | 사이드바를 접은 상태 | `claude-dark-collapsed` |
| 9 | 좁은 창 | 창 너비 700px 이하로 줄인 상태 | `claude-dark-narrow` |

Claude Code 웹(claude.ai/code)은 추가로:

| # | 화면 | 라벨 |
| --- | --- | --- |
| 10 | 세션 목록 | `code-dark-home` |
| 11 | 도구 호출·터미널 출력이 보이는 세션 | `code-dark-session` |
| 12 | 파일 diff가 보이는 세션 | `code-dark-diff` |

**우선순위**: 전부 하기 부담되면 2·3·6번부터. 세 개만 있어도 v1을 잡을 수 있다.

**주의**: JSON에는 요소 설명(data-testid, aria-label)이 들어가지만 대화 본문은 들어가지 않는다. aria-label에 대화 제목이 포함될 수 있으니 민감한 제목이 있으면 보내기 전에 확인한다.

### 메뉴를 연 채로 콘솔 쓰기

메뉴는 포커스가 빠지면 닫힌다. 콘솔에 먼저 아래를 입력해 두고 Enter 후 3초 안에 메뉴를 열면 된다.

```js
setTimeout(() => __ILOOK.run("claude-dark-menu"), 3000)
```

## 결과 파일에 들어가는 것

| 키 | 내용 | 쓰임 |
| --- | --- | --- |
| `mode` | html/body의 class, data-*, color-scheme | 사이트가 모드를 어떻게 바꾸는지 확인 |
| `computed.colors` | 화면의 모든 요소에서 수집한 고유 색. 쓰인 속성, 화면 영역, 예시 요소 4개 | 구역 맵과 1:1 연결 |
| `stylesheets.customColorProps` | 색 값을 가진 CSS 변수와 선언 위치 | 어댑터가 덮어쓸 변수 목록 |
| `stylesheets.rootComputedValues` | 그 변수들의 현재 값 | 모드별 값 비교 |
| `stylesheets.literalColorRules` | 변수 없이 하드코딩된 색 규칙 | 셀렉터로 따로 덮어야 할 곳 |
| `stylesheets.blockedSheets` | 교차 출처라 읽지 못한 시트 | 있으면 알려주기 |
| `unstylable` | canvas, iframe(동일 출처 여부), 이미지 수 | 색을 못 바꾸는 곳 |

## 나중에 쓰는 기능

ILOOK을 켠 뒤 원래 색이 남아 있는지 검사:

```js
const before = __ILOOK.run("claude-dark-chat-before");
// ILOOK 켜기
const after = __ILOOK.run("claude-dark-chat-after");
__ILOOK.residual(before, after);
```

남은 색 0개가 목표.
