# I Look 개인정보처리방침 · Privacy Policy

최종 수정 · Last updated: 2026-10-15

## 한국어

I Look은 ChatGPT와 Claude 웹 화면의 색을 바꾸는 크롬 확장 프로그램입니다.

**수집하는 정보: 없음.**

- I Look은 개인정보, 대화 내용, 방문 기록, 사용 통계 등 어떤 데이터도 수집하지 않습니다.
- 네트워크 요청을 보내지 않습니다. 모든 색 계산은 사용자의 기기 안에서 이루어집니다.
- 외부 서버, 분석 도구, 광고 네트워크를 사용하지 않습니다.

**기기에 저장하는 것**

- 선택한 테마, 직접 만든 테마, 언어 설정만 `chrome.storage.sync`에 저장합니다. 이 값은 Chrome의 동기화 기능을 통해 사용자의 다른 Chrome 프로필로 옮겨질 수 있으며, 개발자는 접근할 수 없습니다.
- 계산된 색상 CSS를 chatgpt.com과 claude.ai의 `localStorage`에 캐시합니다. 새로고침 시 원래 색이 번쩍이지 않게 하기 위한 것이며, 색상 값만 들어 있습니다.

**권한 사용 목적**

- `storage`: 위의 설정 저장
- 호스트 권한(chatgpt.com, claude.ai, *.claudeusercontent.com): 이 사이트에 테마 CSS를 적용하기 위해서만 사용합니다. 페이지 내용을 읽거나 전송하지 않습니다.

**문의**: olnn712@gmail.com

I Look은 OpenAI, Anthropic과 무관한 독립 프로젝트입니다.

## English

I Look is a Chrome extension that changes the colors of the ChatGPT and Claude web apps.

**Data collected: none.**

- I Look does not collect personal information, conversation content, browsing history, usage statistics or any other data.
- It makes no network requests. All color computation happens on your device.
- It uses no external servers, analytics or advertising networks.

**What is stored on your device**

- Your selected theme, custom themes and language setting are saved in `chrome.storage.sync`. Chrome may sync these values to your other Chrome profiles; the developer has no access to them.
- The computed color CSS is cached in `localStorage` on chatgpt.com and claude.ai so the page does not flash its default colors on reload. It contains color values only.

**How permissions are used**

- `storage`: saving the settings above.
- Host permissions (chatgpt.com, claude.ai, *.claudeusercontent.com): used solely to apply the theme CSS on these sites. Page content is never read or transmitted.

**Contact**: olnn712@gmail.com

I Look is an independent project, not affiliated with OpenAI or Anthropic.
