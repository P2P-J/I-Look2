# I Look · VSCode 인수인계

Claude 채팅에서 만든 것과 VSCode + Claude Code에서 이어서 할 일.

## 지금 상태

| 영역 | 상태 | 위치 |
| --- | --- | --- |
| 색 엔진 (시드 3색 → 토큰 48개, 대비 보장) | 완성, 테스트 27개 통과 | `src/engine/` |
| 추천 테마 24개 시드 | 완성 (Radix 값은 npm 패키지에서 추출) | `src/themes/presets.js` |
| 콘텐츠 스크립트 (localStorage 캐시, storage 동기화, 미리보기 메시지) | 완성, 실기기 미검증 | `src/content/` |
| 팝업 UI (사이트 탭, 현재 상태, 목록·편집·설정, 언어 ko/en) | 완성, 디버그 크롬 스크린샷 확인 | `src/popup/` (`popup.js` 상태 / `views.js` 렌더 / `i18n.js` 문자열) |
| 사이트 어댑터 CSS | **v0 초안. 실측 전** | `src/adapters/` |
| 실측 스크립트 | 완성 | `measure/` |
| 빌드 | esbuild, `npm run build` → `dist/extension` | `tools/build-ext.mjs` |

## 크롬에 로드하기

```
npm install
npm run build
```

크롬 → `chrome://extensions` → 개발자 모드 켜기 → "압축해제된 확장 프로그램을 로드합니다" → `dist/extension` 폴더 선택.

코드를 고친 뒤에는 `npm run build` → 확장 카드의 새로고침 ↻ → 사이트 탭 새로고침.

## 가장 먼저 할 일: 어댑터 보정

`src/adapters/*.css`는 공개 자료에서 본 변수 이름으로 쓴 초안이라 실제 사이트와 다를 수 있다. 순서:

1. `measure/README.md`대로 실측 JSON을 뽑는다 (사이트 3곳 × 라이트·다크).
2. JSON의 `stylesheets.customColorProps`에 있는 변수 이름을 어댑터의 변수 목록과 대조한다. 없는 건 지우고, 새로 보이는 건 알맞은 `--ilook-*` 토큰에 연결한다.
3. `stylesheets.literalColorRules`(하드코딩 색)와 `computed.colors`에서 변수로 안 잡히는 색을 찾아 셀렉터로 덮는다. 셀렉터는 `data-testid` > `aria-label` > `role` 순으로 쓰고, 해시 클래스나 Tailwind 유틸 클래스는 쓰지 않는다.
4. ILOOK을 켠 뒤 `__ILOOK.residual(before, after)`로 원래 색이 남은 요소를 찾아 0개가 될 때까지 반복한다.

Claude 변수는 `H S% L%` 세 성분 형식이므로 `--ilook-*-hsl`을 연결한다. hex를 넣으면 깨진다. ChatGPT 변수는 hex 그대로 `--ilook-*`를 쓴다.

## 토큰 → 구역 연결 기준

PRD의 구역 맵 상세 탭(Z0~Z13, 187개 항목)이 어떤 요소에 어떤 토큰을 쓸지의 기준이다. 콘텐츠 스크립트가 `html[data-ilook]`에 아래 세 형태로 토큰을 주입한다.

```
--ilook-bg-app: #1f282d;          hex
--ilook-bg-app-hsl: 203 18.4% 14.9%;   Claude 변수용
--ilook-bg-app-rgb: 31 40 45;     rgb() 형식 변수가 있을 때
```

## 동작 원리 요약

- `document_start`에 `localStorage['ilook:css']`를 동기로 읽어 바로 주입 (번쩍임 방지), 이어서 `chrome.storage.sync`를 읽어 갱신.
- 팝업에서 색을 움직이면 `ilook:preview` 메시지로 열린 탭에 즉시 반영. 저장 전까지 storage에 쓰지 않는다 (sync 쓰기 횟수 제한 때문).
- OFF는 `data-ilook` 속성 제거.
- 사이트별 다른 테마(`perSite`)는 저장 구조만 있고 팝업 토글은 아직 없다.

## 남은 작업 (우선순위순)

1. 어댑터 보정 (위)
2. 실기기에서 번쩍임 0회 확인, 캐시 삭제 후 복구 확인
3. Claude Code 웹(claude.ai/code) 전용 구역 Z13 셀렉터
4. 팝업: 테마 내보내기·가져오기 (설정 화면에 한 줄 추가)
5. 아이콘 교체 (지금은 자리표시용)
6. 출시 전 상표 검토 (Notion 등 이름 사용)

## 자주 쓸 명령

```
npm test              엔진 테스트
npm run preview       dist/preview.html — 테마 16개 토큰 미리보기
npm run build         확장 빌드
```
