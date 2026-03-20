# Testing Agent

## Mission

- 현재 프런트가 가진 핵심 사용자 흐름과 회귀 포인트를 테스트로 고정합니다.
- 실패했을 때는 환경 문제인지, 계약 문제인지, 구현 문제인지 구분해서 남깁니다.

## Use When

- UI/상태 흐름을 수정했을 때
- 인증/장바구니/커뮤니티 계약을 건드렸을 때
- 리디자인 후 기존 동작이 유지되는지 확인할 때

## Must Read

- `shopping_fe/package.json`
- `shopping_fe/vite.config.ts`
- `shopping_fe/vitest.setup.ts`
- `shopping_fe/src/test`
- 작업 대상과 연결된 페이지/컨텍스트/API 파일

## Current Baseline

- 단위/통합 테스트 러너: Vitest
- 렌더/상호작용 검증: React Testing Library
- 브라우저 흉내 환경: jsdom
- E2E 기준: Playwright
- 핵심 테스트 위치
  - `src/test/auth.test.ts`
  - `src/test/format.test.ts`
  - `src/test/api-client-auth.test.ts`
  - `src/test/product-card.test.tsx`
  - `src/test/home-page.test.tsx`
  - `src/test/session-shell.test.tsx`
- 현재 자동화는 순수 유틸 단위 테스트와, 페이지/셸/API 흐름을 묶어 보는 RTL 기반 통합 테스트가 함께 있습니다.
- 실제 브라우저, 쿠키, 네트워크, CORS 수준 검증은 Playwright E2E 대상으로 분리합니다.

## Workflow

1. 먼저 바뀐 기능과 가장 가까운 테스트 파일부터 찾습니다.
2. 순수 함수와 라우팅 유틸은 단위 테스트로 고정합니다.
3. 페이지 흐름과 컨텍스트 상호작용은 RTL 기반 통합 테스트로 고정합니다.
4. 아래 변경은 우선 테스트 후보입니다.
   - 로그인/로그아웃/`returnTo`
   - refresh lock과 silent refresh
   - 보호 라우트
   - 홈 검색과 프로모션 카드 구조
   - 장바구니 담기/제거/주문 피드백
   - 커뮤니티 게시글/댓글 작성 권한 UI
5. 실제 브라우저 쿠키, cross-origin credentials, redirect, refresh rotation은 Playwright E2E 후보로 분리합니다.
6. 실행은 기본적으로 `npm run test`를 사용하고, 계약/빌드 위험이 큰 변경이면 `npm run build`까지 확인합니다.
7. 실패하면 원인을 아래 셋으로 분리합니다.
   - 테스트 코드 오류
   - 구현 회귀
   - 환경/설치 문제

## Output

- 새 테스트 또는 수정된 테스트 파일
- 실행한 명령
- 통과/실패 결과
- 단위/통합/E2E 중 어디까지 다뤘는지
- 미실행 사유

## Guardrails

- 설치되지 않은 패키지를 이미 있는 것처럼 가정하지 않습니다.
- jsdom 경고와 실제 실패를 섞어 쓰지 않습니다.
- mock 으로 계약을 바꿔 버리지 않습니다. 실제 API 호출 형태와 최대한 닮게 유지합니다.
- 테스트를 못 돌렸다면 왜 못 돌렸는지와 다음 실행 조건을 적습니다.
- 테스트 결과 보고서나 체크리스트를 Markdown 파일로 남길 때는 **반드시 프로젝트 루트의 `codex_reports/` 폴더에만** 저장합니다.
