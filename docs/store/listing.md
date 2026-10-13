# 크롬 웹 스토어 등록 자료

대시보드(https://chrome.google.com/webstore/devconsole)에 붙여 넣는 순서대로 정리했다.
이미지는 이 폴더에 있다.

| 파일 | 용도 | 규격 |
| --- | --- | --- |
| `01-hero.png` … `05-per-site.png` | 스크린샷 (이 순서대로 올린다) | 1280×800 |
| `promo-small-440x280.png` | 작은 프로모션 타일 | 440×280 |
| `promo-marquee-1400x560.png` | 마키 프로모션 타일 | 1400×560 |
| `../../src/icons/128.png` | 스토어 아이콘 | 128×128 |

스토어 이름과 짧은 설명은 `src/_locales/{ko,en}/messages.json`의 `appName`·`appDesc`가 그대로 쓰인다. 아래 상세 설명은 언어별로 따로 입력한다.

---

## 상세 설명 (한국어)

```
ChatGPT와 Claude를 내 색으로.

I Look은 ChatGPT, Claude, Claude Code 웹 화면의 색을 바꿔 주는 확장 프로그램입니다. 추천 테마를 고르거나 배경·포인트 색 두세 개만 정하면, 사이드바부터 입력창, 코드 블록, 캔버스, 문서 패널까지 화면 전체가 그 색으로 바뀝니다.

■ 색 세 개면 끝
배경, 포인트, 사이드바(선택)만 고르세요. 글자, 선, 카드, 메뉴, 코드 하이라이트 등 48가지 색은 엔진이 OKLCH 색공간에서 계산합니다. 글자색은 배경에 맞춰 자동으로 정해지므로, 어떤 색을 골라도 글이 읽힙니다.

■ 추천 테마 24개
눈이 편한 Mood 시리즈 10개, 선명한 Radix 시리즈 7개, 에디터에서 익숙한 Catppuccin·Nord·Rosé Pine·Dracula 7개. 라이트와 다크가 고르게 들어 있습니다.

■ 사이트마다 다른 테마
Claude와 ChatGPT에 각각 다른 테마를 둘 수 있습니다. 같게 쓰고 싶으면 설정에서 한 번에 복사합니다.

■ 실시간 미리보기
색을 고르는 동안 열려 있는 탭이 즉시 따라옵니다. 저장하지 않고 닫으면 원래 테마로 돌아갑니다.

■ 테마 공유 코드
내 테마를 한 줄 코드로 복사해 친구에게 보내면, 상대는 설정에 붙여넣기만 하면 됩니다.

■ 번쩍임 없음
계산된 색을 미리 저장해 두고 첫 화면이 그려지기 전에 적용합니다. 새로고침해도 흰 화면이 스치지 않습니다.

■ 아무것도 보내지 않습니다
네트워크 요청 0건. 모든 색은 기기 안에서 계산하고, 대화 내용을 읽지 않습니다. 하는 일은 CSS 변수를 바꿔 끼우는 것뿐입니다.

■ 한국어 / English
브라우저 언어를 따라가고, 설정에서 바꿀 수 있습니다.

적용 사이트: chatgpt.com, claude.ai (Claude Code 웹 포함)

I Look은 OpenAI, Anthropic과 무관한 독립 프로젝트입니다. ChatGPT와 Claude는 각 회사의 상표입니다.
소스 코드: https://github.com/P2P-J/I-Look2
```

## Detailed description (English)

```
Recolor ChatGPT and Claude the way you like.

I Look is a browser extension that changes the colors of the ChatGPT, Claude and Claude Code web apps. Pick a preset, or choose just two or three colors, and the whole screen follows: sidebar, composer, code blocks, canvas, document panels.

■ Three colors is all it takes
Choose a background, an accent and (optionally) a sidebar color. The remaining 48 colors (text, borders, cards, menus, syntax highlighting) are computed by a color engine in the OKLCH color space. Text colors are derived from your background, so whatever you pick stays readable.

■ 24 presets
Ten soft "Mood" themes, seven vivid Radix themes, and seven editor classics (Catppuccin, Nord, Rosé Pine, Dracula). Light and dark are evenly represented.

■ A different theme per site
Keep one theme on Claude and another on ChatGPT. Want them the same? Copy with one tap in Settings.

■ Live preview
While you adjust colors, every open tab updates instantly. Close without saving and the tab returns to its saved theme.

■ Share codes
Copy your custom theme as a one-line code and send it to a friend. They paste it in Settings and get the same theme.

■ No flash on reload
Computed colors are cached and applied before the first paint, so you never see the default white screen flicker.

■ Nothing leaves your device
Zero network requests. All colors are computed locally, and your conversations are never read. The extension only swaps CSS variables.

■ English / 한국어
Follows your browser language; switchable in Settings.

Works on: chatgpt.com, claude.ai (including Claude Code on the web)

I Look is an independent project, not affiliated with OpenAI or Anthropic. ChatGPT and Claude are trademarks of their respective owners.
Source code: https://github.com/P2P-J/I-Look2
```

---

## 카테고리 · 언어

- 카테고리: **생산성** (또는 "접근성")
- 언어: 한국어, English

## 개인정보 보호 탭

**단일 목적 (Single purpose)**

```
Changes the color theme of the ChatGPT and Claude web apps (chatgpt.com, claude.ai) by injecting CSS variables. It has no other function.
```

**권한 사유 (Permission justification)**

| 권한 | 사유 |
| --- | --- |
| `storage` | Saves the user's chosen theme, custom themes and language setting, and syncs them across the user's Chrome profiles. No other data is stored. |
| `scripting` | Claude's document/artifact panel is rendered inside a sandboxed `about:srcdoc` iframe that manifest content scripts cannot reach. We use `chrome.scripting` to inject the same theme CSS and script into that frame only. |
| `webNavigation` | Used only to detect when that sandboxed iframe (parent on `*.claudeusercontent.com`) is committed, so the theme CSS can be injected before it paints. Navigation events on any other site are ignored and nothing is recorded. |
| Host: `chatgpt.com`, `claude.ai`, `*.claudeusercontent.com` | The theme is applied by injecting CSS variables into these pages. `*.claudeusercontent.com` hosts Claude's document frames. No page content is read or transmitted. |

**원격 코드 (Remote code)**: 사용하지 않음. 모든 코드는 패키지에 포함.

**데이터 사용 (Data usage)**: 모든 항목 "수집하지 않음". 아래 세 가지 인증에 체크.
- 승인된 용도 외에 사용자 데이터를 판매하거나 전송하지 않음
- 항목의 핵심 기능과 무관한 목적으로 사용자 데이터를 사용·전송하지 않음
- 신용도 판단이나 대출 목적으로 사용자 데이터를 사용·전송하지 않음

**개인정보처리방침 URL**

```
https://github.com/P2P-J/I-Look2/blob/main/PRIVACY.md
```

## 심사 때 참고

- 심사자가 테스트할 때 로그인이 필요한 사이트이므로, "심사 메모"에 다음을 적는다:
  `The extension only restyles chatgpt.com and claude.ai. Any free account works. Open the popup on either site and click a theme to see the page recolor instantly.`
- `webNavigation` 권한은 설치 창에 "방문 기록 읽기" 경고를 띄운다. 사유란에 위 설명을 그대로 적으면 된다.
- 스크린샷의 사이드바 대화 제목은 예시 문구로 바꿔 찍은 것이고, 나머지는 실제 화면이다.
