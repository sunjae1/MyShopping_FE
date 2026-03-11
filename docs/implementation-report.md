# 쇼핑몰 FE 구현 보고서

## 구현 범위

- 현대적인 랜딩 중심의 홈 화면
- 상품 목록 검색
- 상품 상세
- 장바구니 조회, 제거, 주문
- 로그인, 회원가입, 로그아웃
- 마이페이지
- 커뮤니티 목록, 상세, 게시글 작성
- 댓글 작성, 수정, 삭제

## 사용한 백엔드 API

- `GET /api/items`
- `GET /api/items/{id}`
- `GET /api/categories`
- `POST /api/login`
- `POST /api/logout`
- `POST /api/register`
- `GET /api`
- `GET /api/cart`
- `POST /api/cart/items/{itemId}`
- `DELETE /api/cart/items/{itemId}`
- `POST /api/orders`
- `DELETE /api/orders/{id}`
- `GET /api/myPage`
- `PUT /api/users`
- `GET /api/posts`
- `GET /api/posts/{id}`
- `POST /api/posts`
- `PUT /api/posts/{id}`
- `DELETE /api/posts/{id}`
- `POST /api/posts/{postId}/comments`
- `PUT /api/posts/{postId}/comments/{commentId}`
- `DELETE /api/posts/{postId}/comments/{commentId}`

## 구조 요약

- Vite + React + TypeScript
- React Router 기반 라우팅
- `SessionContext`로 로그인 상태 관리
- `CartContext`로 장바구니 상태 관리
- 공통 API 클라이언트에서 `credentials: include` 처리
- `RequireAuth`로 보호 라우트 관리
- 보호 API 401 발생 시 로그인 페이지와 `returnTo`로 연결
- `/api/logout` 기반 로그아웃 처리 및 홈 이동

## 생성된 에이전트 문서

- `shopping_fe/AGENTS.md`
- `shopping_fe/agents/planning-agent.md`
- `shopping_fe/agents/implementation-agent.md`
- `shopping_fe/agents/testing-agent.md`
- `shopping_fe/agents/reporting-agent.md`
- `shopping_fe/agents/error-audit-agent.md`

## 검증 결과

### 빌드

성공

```bash
npm run build
```

### 테스트

성공

```bash
npm run test
```

총 3개 테스트 파일, 6개 테스트 통과

## 참고한 기존 구조

- Thymeleaf SSR 템플릿
- Spring Security form login / JSON login 혼합 구조
- 기존 상품, 장바구니, 게시판 흐름
