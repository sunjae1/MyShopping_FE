# JWT Cookie Refresh Lock Report

작성일: 2026-03-18

## 작업 목적

백엔드가 `/api/**` 전역을 JWT 기반으로 전환했고, Refresh Token Rotation까지 Redis로 구현한 상태라서 프런트도 그 계약에 맞춰 인증 흐름을 다시 맞출 필요가 있었습니다.

이번 작업의 목표는 다음 네 가지였습니다.

- Access Token, Refresh Token을 모두 HttpOnly 쿠키로 전제하기
- 모든 API 요청에서 `credentials: include`를 유지하기
- `401 -> /api/auth/refresh -> 원래 요청 재시도` 흐름을 프런트 공통 API 클라이언트에 넣기
- 동시에 여러 요청이 `401`을 받아도 refresh 요청은 한 번만 보내는 refresh lock을 구현하기

## 이번에 바뀐 핵심 결과

### 1. 공통 API 클라이언트가 JWT 쿠키 흐름을 직접 처리

- `shopping_fe/src/api/client.ts`
- 보호 API가 `401`을 받으면 바로 로그인 이동부터 하지 않고, 먼저 `POST /api/auth/refresh`를 시도합니다.
- refresh 성공 시 원래 요청을 한 번만 다시 보냅니다.
- refresh 실패 시 보호 요청은 기존 `auth-required` 이벤트 흐름으로 로그인 페이지 이동을 유도합니다.
- 여러 보호 요청이 동시에 `401`을 받아도 refresh 요청은 하나만 보내고 나머지는 같은 promise를 기다리도록 lock을 넣었습니다.

### 2. 로그인/로그아웃 계약을 현재 백엔드 코드 기준으로 정렬

- 로그인 응답은 이제 `User` 단일 객체가 아니라 `{ accessTokenExpiresInSeconds, user }` shape 를 기준으로 읽습니다.
- 프런트 `login()`은 응답의 `user`만 꺼내 반환하도록 수정했습니다.
- 로그아웃 경로는 기존 `/api/logout` 가정에서 현재 백엔드 계약인 `POST /api/auth/logout`으로 맞췄습니다.

### 3. 화면 문구도 JWT HttpOnly 쿠키 기준으로 정리

- `shopping_fe/src/pages/LoginPage.tsx`
- `shopping_fe/src/pages/CartPage.tsx`
- `shopping_fe/src/components/AppShell.tsx`

기존의 "세션 기반 로그인/인증" 문구를 지금 구조에 맞는 "JWT HttpOnly 쿠키 인증" 설명으로 바꿨습니다.

## 테스트와 검증

### 추가한 테스트

- `shopping_fe/src/test/api-client-auth.test.ts`
  - 로그인 응답 shape 확인
  - 보호 요청의 refresh 후 1회 재시도
  - 동시 `401` 상황에서 refresh lock 공유
  - refresh 실패 시 auth-required 이벤트 1회 발생
  - 초기 `/api` 세션 확인에서 silent refresh 복구
- `shopping_fe/src/test/session-shell.test.tsx`
  - auth-required 이벤트 발생 시 `AppShell`이 세션을 정리하고 로그인 경로로 이동하는지 확인

이번 자동화는 "단위 테스트만"이 아니라 아래 두 층으로 보는 편이 맞습니다.

- 단위 테스트
  - 유틸과 응답 shape, 순수 함수 검증
- 통합 테스트
  - `Vitest + React Testing Library`로 API 클라이언트, 컨텍스트, 셸, 라우팅 이벤트 흐름을 함께 확인

E2E는 아직 추가하지 않았고, 다음 단계의 기준은 `Playwright`로 잡는 것이 맞습니다.

### 실행 결과

2026-03-18 기준 실행 결과:

- `npm run test`
  - 성공
  - 6개 테스트 파일, 16개 테스트 통과
- `npm run build`
  - 성공
  - TypeScript 검사와 Vite 프로덕션 빌드 통과

## 백엔드 계약 기준으로 맞춘 내용

- 로그인: `POST /api/login`
- 토큰 재발급: `POST /api/auth/refresh`
- 로그아웃: `POST /api/auth/logout`
- 인증 확인용 초기 호출: `GET /api`
- 쿠키 저장 위치: Access Token, Refresh Token 모두 HttpOnly 쿠키
- 브라우저 저장소: `localStorage`, `sessionStorage` 사용 안 함
- CORS: cross-origin 환경이지만 같은 site 전제를 유지하고, 프런트는 항상 `credentials: include`

## 남은 리스크와 후속 권장

### 1. 레거시 문서 일부는 아직 세션 기반 설명이 남아 있음

기존 `shopping_fe/docs` 안의 예전 인증 문서들은 `/api/logout`, 세션 기반 인증 설명을 포함합니다.
이번 보고서와 실제 코드가 현재 진실값이며, 이전 문서는 역사 문서로 취급하는 편이 안전합니다.

### 2. React Router 경고와 테스트 로그 정리가 남아 있음

테스트는 모두 통과했지만 React Router v7 future flag 경고가 출력됩니다.
현재 실패 원인은 아니지만, 라우터 업그레이드 시 미리 정리할 가치가 있습니다.

### 3. 실제 브라우저 수준 검증은 아직 Playwright E2E가 필요

이번 자동화는 `Vitest + jsdom + React Testing Library` 기준의 단위/통합 테스트까지 포함합니다.
하지만 실제 브라우저의 쿠키 반영, CORS, `Set-Cookie`, refresh rotation 타이밍까지 완전하게 재현하는 수준은 아니므로, 다음 단계에서는 Playwright E2E를 붙이는 것이 가장 안전합니다.

## Q&A

### Q1. 프런트엔드에서 테스트는 어떤 식으로 되는가?

현재 프로젝트는 `Vitest + jsdom + Testing Library`를 사용합니다.
즉, 브라우저를 흉내 낸 DOM 환경에서 컴포넌트 렌더링, 사용자 이벤트, 라우팅, 상태 변화, API mock 흐름을 검증합니다.
단순히 변수만 보는 것이 아니라, 화면에 실제로 무엇이 보이는지와 이벤트 후 결과까지 같이 봅니다.

이번 구조에서는 이걸 "단위 + RTL 기반 통합 테스트"로 보는 편이 더 정확합니다.

### Q2. 직접 웹 브라우저를 켜서 확인할 수 있는가?

기본 자동 검증은 실제 브라우저 탭을 사람이 눈으로 보는 방식이 아니라 테스트 러너 기반입니다.
이번 작업도 실제로는 API mock, DOM 렌더링, 라우팅, 재시도 흐름을 코드로 검증했습니다.

다만 실제 브라우저 탭에서 돌아가는 쿠키, cross-origin credentials, `Set-Cookie`, refresh rotation까지 보려면 별도 E2E가 필요합니다.
여기서는 그 다음 단계 도구를 `Playwright`로 잡는 것이 맞습니다.

### Q3. VS Code Codex에서만 sub-agent가 가능한가?

현재 확인한 공식 문서 기준으로는 그렇게 단정하기는 어렵습니다.
Codex 문서는 subagent workflow 자체보다, activity visibility가 Codex app과 CLI에서 먼저 보이고 IDE extension 쪽 visibility는 점진적으로 지원된다고 안내합니다.

즉, "기능 자체가 VS Code 전용"이라기보다 "IDE에서 보이는 방식과 지원 상태가 아직 완전히 같지 않을 수 있다"에 가깝습니다.

### Q4. IntelliJ 플러그인에서는 sub-agent 알림이 왜 안 보일 수 있는가?

공식 문서에는 JetBrains IDE 통합 자체는 안내되어 있습니다.
다만 subagent activity visibility가 IDE extension에서 아직 완전히 동일하지 않을 수 있으므로, IntelliJ에서 기대한 알림이나 가시성이 안 보일 가능성은 있습니다.

이 부분은 제품 지원 상태에 따라 달라질 수 있으니, 실제 사용 경험은 IDE 버전과 확장 지원 상태를 같이 확인하는 것이 안전합니다.
