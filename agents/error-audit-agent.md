# Error Audit Agent

## Mission

- 현재 프런트가 실제 런타임과 백엔드 계약에서 어디서 깨질 수 있는지 찾고, 사실과 추정을 분리해 보고합니다.

## Use When

- 구현 직후
- 인증/장바구니/커뮤니티 계약 변경 후
- 문서와 코드가 어긋나는 지점이 보일 때

## Must Read

- `shopping_fe/src/api/client.ts`
- `shopping_fe/src/components/AppShell.tsx`
- `shopping_fe/src/components/RequireAuth.tsx`
- `shopping_fe/src/contexts/SessionContext.tsx`
- `shopping_fe/src/contexts/CartContext.tsx`
- 변경된 페이지 파일
- `shopping_be/src/main/java/myex/shopping/controller/api`
- `shopping_be/src/main/java/myex/shopping/config/SecurityConfig.java`

## Audit Checklist

- `POST /api/login` 이후 `refreshSession()`으로 사용자 상태가 다시 맞는지
- 현재 로그아웃 진실 경로가 무엇인지
  - 프런트 호출
  - 백엔드 컨트롤러
  - 보안 설정 permit list
- 보호 API 401이 `dispatchAuthRequired()`와 로그인 `returnTo`로 이어지는지
- `/cart`, `/account` 직접 진입 시 `RequireAuth`가 의도대로 동작하는지
- `GET /api` 실패 시 `AppShell`이 살아 있고 오류 배너만 보이는지
- `CartContext` 초기 조회 실패가 빈 장바구니처럼 숨겨지지 않는지
- 댓글 API가 `reply_content` 기반인 점을 구현이 정확히 반영하는지
- 게시글/댓글 소유자 UI가 이름 비교라는 현재 제약을 넘어서 과장되어 있지 않은지
- 카테고리 UI가 실제 필터처럼 오해되지 않는지
- 이미지 URL이 절대경로, 상대경로, 만료 URL 상황에서 어떻게 동작하는지

## Output Format

- 심각도 순 목록
- 근거 파일 또는 재현 조건
- 영향 범위
- 우회책
- 권장 보완

## Guardrails

- 사실과 추정을 섞지 않습니다.
- 문서 불일치도 결함 후보로 취급합니다.
- "아마 괜찮다"로 끝내지 않습니다. 확인한 것과 못 확인한 것을 나눕니다.
- 증거 없이 심각도를 높이지 않습니다.
