# ILOOK

ChatGPT, Claude, Claude Code 웹 화면의 색을 바꾸는 크롬 확장 프로그램.
배경·포인트·사이드바 색 2~3개만 고르면 화면 전체 색 48개가 자동 계산되고, 어떤 색을 골라도 글자 대비(WCAG AA)가 보장된다.

## 구조

```
src/engine/   색 엔진 (순수 함수, 브라우저 불필요)
measure/      실측 스크립트 — 사이트가 쓰는 색·CSS 변수 전수 수집
test/         엔진 테스트 (극단 시드 20개)
tools/        미리보기 빌드 등 개발 도구
```

## 개발

```
npm test                       # 엔진 테스트
node tools/build-preview.mjs   # dist/preview.html 생성
```

## 진행 상태

- [x] PRD, 구역 맵 v0 (187개 항목)
- [x] 색 엔진 + 테스트
- [ ] 실측 → 구역 맵 v1
- [x] 확장 뼈대 (manifest, 콘텐츠 스크립트, 어댑터 v0, 팝업)
- [x] 추천 테마 24개 시드
- [ ] 어댑터 CSS 실측 보정 → 원래 색 잔존 0개

자세한 진행 방법은 [HANDOFF.md](HANDOFF.md).
