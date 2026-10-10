# I Look

ChatGPT, Claude, Claude Code 웹 화면의 색을 바꾸는 크롬 확장 프로그램.
색 2~3개만 고르면 화면 전체 색 48개가 자동으로 계산되고, 어떤 색을 골라도 글자는 읽힌다.

## 왜 만들었나

ChatGPT와 Claude는 하루에 몇 시간씩 보는 화면인데, 배경은 흰색 아니면 검은색뿐이다. ChatGPT에 포인트색 설정이 있지만 버튼과 말풍선 일부에만 적용되고, Claude는 라이트·다크 전환이 전부다. 사용자가 직접 CSS를 고치려면 개발 지식이 필요하고, 사이트가 업데이트될 때마다 깨진다.

기존 테마 확장은 두 극단이다. 프리셋 몇 개를 고르기만 하거나, 색 수십 개를 하나하나 직접 지정해야 한다. 후자는 "검은 배경에 검은 글자"처럼 읽을 수 없는 조합을 막지 못한다.

## 무엇을 해결했나

| 문제 | 해결 |
| --- | --- |
| 색을 수십 개 지정해야 한다 | 배경·포인트·사이드바 **3색만** 고르면 나머지 45개를 색 엔진이 계산한다 |
| 글자가 안 보이는 조합이 나온다 | 모든 글자색은 배경에서 계산하고 WCAG 대비(본문 4.5:1 이상)를 **항상 보장**한다. 사용자는 글자색을 고를 수 없다 |
| 사이트 개편에 깨진다 | 사이트별 차이는 어댑터 CSS 한 파일에만 둔다. 색 전수 수집 스크립트로 빠진 곳을 숫자로 찾는다 |
| 새로고침 때 원래 색이 번쩍인다 | 계산된 CSS를 사이트 localStorage에 캐시해 첫 페인트 전에 적용한다 |
| 어디를 칠해야 하는지 모른다 | 채팅 화면을 14개 구역, 187개 요소, 상태 9종으로 분해한 구역 맵을 기준으로 삼는다 |

## 어떻게 동작하나

```
팝업에서 시드 3색 선택
      │
      ▼
색 엔진 (src/engine)            OKLCH 색공간에서 토큰 48개 계산
  · 배경 휘도로 글자 방향 결정      어두우면 밝은 글자, 밝으면 어두운 글자
  · ensureContrast()             대비 기준에 닿을 때까지 명도만 조정
  · 층 분리 보장                  hover·카드·메뉴가 배경과 구분되게
      │
      ▼
콘텐츠 스크립트 (src/content)    html[data-ilook]에 CSS 변수 주입
      │                          localStorage 캐시로 번쩍임 방지
      ▼
어댑터 CSS (src/adapters)        사이트 변수(--bg-100, --main-surface-primary …)를
                                 I Look 토큰(--ilook-*)에 연결
```

**구조의 핵심은 3층 분리다.** 구역(화면 위치)은 토큰(의미)만 참조하고, 테마는 시드 3색만 가진다. 구역을 아무리 잘게 쪼개도 테마 하나 만드는 비용은 색 3개로 고정된다.

## 기술 결정

- **OKLCH 색공간**: 명도가 사람 눈과 비슷하게 움직여서 "한 단계 밝게"가 모든 색상에서 같은 체감이 된다. HSL은 노랑과 파랑에서 틀린다.
- **글자색은 자동**: 사용자 자유도를 줄이는 대신 "읽을 수 없는 테마"를 원천 차단했다. 극단 시드 20개(순백, 순흑, 중간 회색, 형광 핑크 등)로 테스트한다.
- **외부 API 없음**: 팔레트는 전부 번들하고 런타임 네트워크 요청은 0건이다. 대화 내용을 읽지 않는다.
- **Manifest V3**, 권한은 `storage` 하나. `tabs` 권한은 "방문 기록 읽기" 경고를 띄우므로 쓰지 않는다.
- **Claude 변수 형식 대응**: Claude의 CSS 변수는 `50 23% 94%`처럼 HSL 세 성분만 담는다. 엔진이 hex·HSL·RGB 세 형식을 모두 내보내 어댑터가 맞는 걸 쓴다.

## 테마 출처

| 시리즈 | 출처 | 라이선스 |
| --- | --- | --- |
| Notion | Notion 앱 색상 체계 (제3자 추출값) | 상표 검토 예정 |
| Radix | [Radix Colors](https://github.com/radix-ui/colors) 1·2·9단계 | MIT |
| Editor | [Catppuccin](https://github.com/catppuccin/catppuccin), [Nord](https://www.nordtheme.com/), [Rosé Pine](https://rosepinetheme.com/), [Dracula](https://draculatheme.com/) | MIT |

## 시작하기

```
git clone https://github.com/P2P-J/I-Look2.git
cd I-Look2
npm install
npm run build
```

크롬 → `chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램을 로드" → `dist/extension`.

```
npm test            색 엔진 테스트 (극단 시드 20개 포함 27개)
npm run preview     dist/preview.html — 테마 16개 토큰 미리보기
npm run build       확장 빌드
```

## 구조

```
src/engine/     색 엔진 — 순수 함수, 브라우저 없이 테스트
src/themes/     추천 테마 24개 시드
src/content/    콘텐츠 스크립트
src/popup/      팝업 UI
src/adapters/   사이트별 CSS (chatgpt.css, claude.css)
measure/        색 전수 수집 스크립트 + 실측 가이드
test/           엔진 테스트
tools/          빌드·미리보기 스크립트
```

## 진행 상태

- [x] 구역 맵 (14구역, 187개 요소, 상태 9종)
- [x] 색 엔진, 테스트 27개
- [x] 추천 테마 24개
- [x] 확장 뼈대 (콘텐츠 스크립트, 팝업, 빌드)
- [ ] 어댑터 CSS 실측 보정 → 원래 색 잔존 0개
- [ ] Claude Code 웹 전용 요소
- [ ] 크롬 웹 스토어 출시

이어서 할 일은 [HANDOFF.md](HANDOFF.md)에 있다.

---

I Look은 OpenAI, Anthropic과 무관한 독립 프로젝트다.
