# Shopping FE Agents

`shopping_fe` 작업은 "워크플로 에이전트"와 "기능형 에이전트"를 함께 사용합니다.

## Workflow Agents

기본 순서는 아래와 같습니다.

1. `planning-agent.md`
2. `implementation-agent.md`
3. `testing-agent.md`
4. `error-audit-agent.md`
5. `reporting-agent.md`

## Feature Agents

기능형 작업은 아래 에이전트를 상황별로 끼워서 사용합니다.

- `agents/fe_agents/csr-commerce-redesign-agent.md`
- `agents/fe_agents/auth-contract-agent.md`
- `agents/fe_agents/community-flow-agent.md`

## Current Project Truths

- 스택: Vite 5, React 18, TypeScript, React Router 6, Vitest, Testing Library
- 현재 라우트: `/`, `/products/:productId`, `/login`, `/register`, `/community`, `/community/:postId`, `/cart`, `/account`
- 공개 API: `GET /api/items`, `GET /api/items/{id}`, `GET /api/categories`, `GET /api/posts`, `GET /api/posts/{id}`
- 인증 필요 API: `GET /api`, `GET /api/myPage`, `PUT /api/users`, `GET/POST/DELETE /api/cart...`, `POST/DELETE /api/orders...`, 게시글/댓글 쓰기 API
- 핵심 상태는 `SessionContext`와 `CartContext`에 모여 있으므로, 페이지별 중복 상태를 만들기보다 기존 컨텍스트를 확장하는 쪽을 우선합니다.
- 프런트는 `credentials: include`를 사용하고, 현재 백엔드는 `POST /api/login`에서 HttpOnly 쿠키를 발급합니다.
- 인증 확인은 현재 `GET /api`에 의존합니다. 이름은 세션처럼 보이지만 실제 백엔드 인증 구현은 쿠키 기반 JWT 흐름입니다.
- 댓글 작성과 수정은 JSON이 아니라 `reply_content` `requestParam` 기반입니다.
- 카테고리 API는 있지만 상품 DTO에 카테고리 연결 정보가 없어서, 카테고리 UI는 탐색 카드이지 실제 필터가 아닙니다.
- 게시글/댓글 소유자 판별은 DTO에 작성자 ID가 없어 현재 `user.name` 문자열 비교에 의존합니다.
- 로그아웃 계약은 문서와 코드가 어긋나 있습니다. 프런트 문서/클라이언트는 `/api/logout`을 많이 가리키지만, 현재 백엔드 컨트롤러와 보안 설정은 `/api/auth/logout`을 노출합니다. 인증 관련 작업은 이 불일치를 먼저 해소하거나 명시적으로 문서화해야 합니다.

## Operating Rules

- 백엔드에 없는 엔드포인트, 할인 정책, 배송 정보, 랭킹 근거, 관리자 UI를 임의로 만들지 않습니다.
- 이 프런트의 백엔드 기준은 `controller/api`와 `/api/**` 계약입니다. `controller/web`와 SSR 템플릿은 기본적으로 무시하고, 사용자가 명시적으로 레거시 비교를 요청한 경우에만 봅니다.
- 인증, 장바구니, 커뮤니티 흐름을 건드리면 테스트와 보고 문서까지 같은 작업 안에서 같이 갱신합니다.
- 사용자가 보고서, 계획서, 로드맵, 체크리스트, 리뷰 정리 같은 Markdown 문서를 요청하면 새 파일은 **반드시 프로젝트 루트의 `codex_reports/` 폴더에만** 저장합니다. `shopping_fe/docs`나 다른 하위 폴더에는 새 보고서 파일을 만들지 않습니다.
- 문서와 코드가 충돌하면 오래된 문서를 맹신하지 말고 현재 코드 기준 진실을 먼저 적습니다.
- 모든 작업은 변경 파일, 실행 명령, 성공/실패 상태, 남은 리스크를 다음 에이전트가 바로 이어받을 수 있게 남깁니다.
