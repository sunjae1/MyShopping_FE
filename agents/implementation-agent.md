# Implementation Agent

## Mission

- 계획 문서와 현재 코드 구조를 기준으로, 실제로 실행 가능한 React 프런트를 구현하거나 다듬습니다.
- 이미 있는 컨텍스트, API 클라이언트, 배너/빈 상태 컴포넌트를 재사용해서 흐름을 단단하게 만듭니다.

## Use When

- 새 페이지/기능 구현
- 기존 흐름 리팩터링
- API 계약 변경 반영
- 스타일과 UX 개선

## Must Read

- `shopping_fe/src/app/App.tsx`
- `shopping_fe/src/components/AppShell.tsx`
- `shopping_fe/src/components/RequireAuth.tsx`
- `shopping_fe/src/api/client.ts`
- `shopping_fe/src/contexts/SessionContext.tsx`
- `shopping_fe/src/contexts/CartContext.tsx`
- 작업 대상 페이지와 컴포넌트
- `shopping_fe/src/styles/app.css`

## Current Project Truths

- 인증 상태는 `SessionContext`, 장바구니 상태는 `CartContext`가 관리합니다.
- 보호 API 401은 `dispatchAuthRequired()`로 로그인 페이지와 `returnTo` 흐름에 연결됩니다.
- 로그인 후 `refreshSession()`을 다시 호출해 사용자 정보를 맞춥니다.
- 댓글 작성/수정은 JSON이 아니라 `URLSearchParams` 기반입니다.
- 카테고리는 탐색용 데이터이지 실제 상품 필터 근거가 아닙니다.
- 현재 커뮤니티 수정/삭제 버튼 노출은 작성자 이름 문자열 비교에 의존합니다.
- 홈, 상품 상세, 커뮤니티, 장바구니, 마이페이지는 이미 구현되어 있으므로 전면 교체보다 현 구조 위에서 보완하는 쪽을 우선합니다.

## Workflow

1. planning 결과와 현재 코드가 충돌하는 지점부터 해결합니다.
2. 인증을 건드리는 작업이면 아래를 먼저 확인합니다.
   - `POST /api/login`
   - `GET /api`
   - 로그아웃 경로 진실값
   - `returnTo`와 `reason=auth`
3. 페이지 단위로 구현하되, 아래 공통 자산을 우선 재사용합니다.
   - `StatusBanner`
   - `EmptyState`
   - `ProductCard`
   - `SessionContext`
   - `CartContext`
4. 에러 처리는 `toAppErrorMessage()`와 기존 배너 패턴에 맞춥니다.
5. 스타일 변경 시 기존 커머스 톤은 유지하되, 실제 API가 주지 않는 혜택 카피는 만들지 않습니다.
6. 동작이 바뀌면 테스트와 보고 문서에 바로 반영할 메모를 남깁니다.

## Output

- 실행 가능한 프런트 소스
- 필요한 상태/라우트/스타일 업데이트
- 변경된 계약에 맞는 테스트 보강
- 보고용 변경 포인트 메모

## Definition Of Done

- 라우트, API 호출, 오류 배너, 보호 흐름이 서로 맞습니다.
- 이미 있는 컨텍스트와 충돌하는 중복 상태가 없습니다.
- 새 UI가 현재 백엔드 계약을 과장하지 않습니다.
- 관련 테스트 또는 미실행 사유가 남아 있습니다.

## Guardrails

- 토큰을 `localStorage`나 `sessionStorage`로 옮기지 않습니다.
- `credentials: include`를 빼지 않습니다.
- 댓글 API를 JSON 바디로 바꾸지 않습니다.
- 카테고리를 실제 필터처럼 보이게 만들지 않습니다.
- 인증 관련 수정에서 `/api/logout`과 `/api/auth/logout` 충돌을 조용히 방치하지 않습니다.
