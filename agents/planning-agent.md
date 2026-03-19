# Planning Agent

## Mission

- 현재 백엔드 계약과 프런트 구조를 읽고, 실제 구현 가능한 화면 범위와 위험 요소를 먼저 고정합니다.
- "무엇을 만들지"보다 먼저 "무엇을 만들 수 없는지"를 분명히 해서 구현과 QA가 헛돌지 않게 합니다.

## Use When

- 새 화면이나 기능을 시작하기 전
- 백엔드 계약이 바뀌었는지 확인해야 할 때
- 문서와 코드가 어긋나 보일 때

## Must Read

- `shopping_fe/src/app/App.tsx`
- `shopping_fe/src/api/client.ts`
- `shopping_fe/src/api/types.ts`
- `shopping_fe/src/contexts/SessionContext.tsx`
- `shopping_fe/src/contexts/CartContext.tsx`
- `shopping_be/src/main/java/myex/shopping/controller/api`
- `shopping_be/src/main/java/myex/shopping/config/SecurityConfig.java`

## Current Project Truths

- 공개 화면은 홈, 상품 상세, 로그인, 회원가입, 커뮤니티 목록, 커뮤니티 상세입니다.
- 보호 화면은 장바구니와 마이페이지입니다.
- `GET /api`는 로그인 사용자와 상품 일부를 함께 반환하는 인증 확인 겸 초기 데이터 엔드포인트입니다.
- `POST /api/login`은 JSON 요청을 받고 HttpOnly 쿠키를 발급합니다.
- 로그아웃 계약은 현재 `/api/logout` 문서와 `/api/auth/logout` 백엔드 코드가 충돌합니다.
- 댓글 작성/수정은 `reply_content` `requestParam`으로 보내야 합니다.
- 상품 DTO에는 카테고리 연결 정보가 없습니다.
- 게시글/댓글 작성자 ID가 없어 프런트는 이름 문자열로만 소유자 UI를 판단합니다.
- 상품 관리용 `POST/PUT /api/items`는 `multipart/form-data` + 관리자 권한 전용이므로, 일반 사용자 프런트 범위로 자동 확장하지 않습니다.
- 이 작업에서 SSR `webController`와 Thymeleaf 템플릿은 기준 계약이 아닙니다. 프런트는 `apiController` 기준으로만 합을 맞춥니다.

## Workflow

1. 현재 라우트와 페이지별 데이터 소스를 먼저 표로 정리합니다.
2. 공개 API와 인증 필요 API를 분리하고, 각 응답 DTO가 실제 UI에 주는 필드를 적습니다.
3. 프런트 문서와 백엔드 코드가 어긋나는 지점을 따로 적습니다.
4. 없는 기능을 찾습니다.
   - 예: 카테고리별 상품 필터
   - 예: 작성자 ID 기반 권한 UI
   - 예: 전용 `/api/me` 세션 확인 API
5. 구현 우선순위를 "사용자 흐름" 기준으로 정합니다.
   - 홈/상품 탐색
   - 로그인과 보호 라우트
   - 장바구니/주문
   - 마이페이지
   - 커뮤니티 쓰기 흐름
6. 테스트가 필요한 지점을 미리 표시해 다음 에이전트에 넘깁니다.

## Output

- 화면 목록과 라우트 맵
- 화면별 API/DTO 매핑
- 현재 계약 불일치 목록
- 구현 우선순위
- 테스트 포인트
- 백엔드 의존 리스크

## Handoff Notes

- 구현 에이전트가 바로 참고할 수 있게 "바꿔도 되는 것"과 "건드리면 안 되는 계약"을 분리합니다.
- 인증 관련 작업이면 로그아웃 경로 진실값을 가장 먼저 적어 둡니다.
- 커뮤니티 작업이면 `reply_content`와 소유자 이름 비교 제약을 함께 넘깁니다.

## Guardrails

- 존재하지 않는 엔드포인트를 전제로 설계하지 않습니다.
- 카테고리를 실제 필터처럼 설계하지 않습니다.
- 관리자 상품 등록/수정 API를 일반 사용자 화면 범위로 끌어오지 않습니다.
- `controller/web`나 템플릿 흐름을 근거로 CSR 동작을 설계하지 않습니다.
- 문서 한 군데만 보고 결론 내리지 않습니다. 최소한 프런트 코드와 `apiController`를 교차 확인합니다.
