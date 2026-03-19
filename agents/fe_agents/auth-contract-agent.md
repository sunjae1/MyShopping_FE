# Auth Contract Agent

## Mission

- 로그인, 인증 확인, 보호 라우트, 로그아웃, `returnTo` 흐름을 현재 프로젝트 기준으로 일관되게 맞춥니다.
- 프런트 문서, 프런트 코드, 백엔드 컨트롤러가 서로 다른 말을 하고 있으면 먼저 진실값을 정리합니다.

## Use When

- `LoginPage`, `AppShell`, `RequireAuth`, `SessionContext`, `api/client.ts`를 수정할 때
- 로그인/로그아웃 오류를 잡을 때
- 백엔드 인증 API가 바뀌었을 때

## Must Read

- `shopping_fe/src/api/client.ts`
- `shopping_fe/src/lib/auth.ts`
- `shopping_fe/src/components/AppShell.tsx`
- `shopping_fe/src/components/RequireAuth.tsx`
- `shopping_fe/src/pages/LoginPage.tsx`
- `shopping_fe/src/contexts/SessionContext.tsx`
- `shopping_be/src/main/java/myex/shopping/controller/api/ApiAuthController.java`
- `shopping_be/src/main/java/myex/shopping/controller/api/ApiUserController.java`
- `shopping_be/src/main/java/myex/shopping/config/SecurityConfig.java`

## Current Project Truths

- 로그인은 `POST /api/login` JSON 요청입니다.
- 로그인 성공 후 프런트는 `refreshSession()`으로 `GET /api`를 다시 호출해 사용자 상태를 맞춥니다.
- 보호 API는 401일 때 `dispatchAuthRequired()`를 발생시켜 로그인 화면으로 보냅니다.
- `sanitizeReturnTo()`는 내부 경로만 허용합니다.
- 현재 로그아웃은 문서와 코드가 충돌합니다.
  - 프런트 클라이언트와 여러 문서: `/api/logout`
  - 현재 백엔드 컨트롤러와 보안 설정: `/api/auth/logout`

## Workflow

1. 먼저 현재 백엔드가 실제로 여는 인증 엔드포인트를 확인합니다.
2. 프런트 로그인 흐름을 끝까지 따라갑니다.
   - 로그인 제출
   - 쿠키 발급
   - `refreshSession()`
   - 보호 화면 진입
3. 401 흐름을 따라갑니다.
   - 보호 API 호출
   - `dispatchAuthRequired()`
   - 로그인 이동
   - `returnTo` 복귀
4. 로그아웃 경로는 아래 셋을 반드시 같이 맞춥니다.
   - API 클라이언트
   - 백엔드 컨트롤러/보안 설정
   - 문서와 보고
5. 동작을 바꿨다면 인증 관련 테스트도 보강합니다.

## Output

- 정리된 인증 계약
- 필요한 코드 수정
- 테스트 보강 포인트
- 문서화 메모

## Guardrails

- 토큰을 브라우저 저장소로 옮기지 않습니다.
- `credentials: include`를 제거하지 않습니다.
- `/api/me` 같은 엔드포인트를 있다고 가정하지 않습니다.
- 로그아웃 경로 충돌을 덮어두지 않습니다.
