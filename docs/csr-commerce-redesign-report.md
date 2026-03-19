# CSR Commerce Redesign Report

작성일: 2026-03-13

## 작업 목적

기존 CSR 홈은 큰 히어로와 에디토리얼 카피 비중이 커서 실제 쇼핑몰 첫 화면보다 `Claude homepage` 계열 랜딩처럼 보였습니다. 이번 작업에서는 `shopping_fe/agents/fe_agents/csr-commerce-redesign-agent.md`를 추가하고, 홈을 프로모션 카드, 카테고리 진입점, 랭킹, 카탈로그, 커뮤니티 흐름 중심의 쇼핑몰형 레이아웃으로 다시 설계했습니다.

디자인 방향은 현대 계열 커머스에서 보이는 정보 밀도 높은 메인 구조를 참고했습니다. 이는 공식 현대Hmall 메인에서 확인되는 탐색 중심 구조를 참고한 추론이며, 브랜드 문구나 혜택 카피를 그대로 복제하지는 않았습니다.
참고 링크: https://www.hmall.com/md/dpl/index

## 이번에 바뀐 결과

### 1. 홈 화면을 탐색형 쇼핑몰 구조로 재설계

- 단일 히어로 카드 대신 메인 프로모션, 요약 카드 3종, 카테고리 바로가기, 가격대 상위 상품, 재고 임박 상품, 최근 게시글 섹션을 한 화면에 배치했습니다.
- 검색 입력과 전체 상품 그리드는 유지하되, 카테고리 필터처럼 오해할 수 있는 UI는 넣지 않았습니다.
- 카피도 기술 데모 설명 대신 실제 쇼핑몰 메인처럼 상품 탐색과 진입 동선을 중심으로 정리했습니다.

### 2. 공통 UI 톤을 쇼핑몰형으로 통일

- 헤더에 서비스 바를 추가하고 브랜드/네비게이션 문구를 더 직접적인 쇼핑몰 톤으로 바꿨습니다.
- 카드, 버튼, 입력창, 상품 카드, 상품 상세의 컬러와 반경, 그림자 체계를 전부 다시 맞췄습니다.
- 세리프 중심 에디토리얼 무드를 줄이고, 더 평평하고 밀도 있는 커머스형 레이아웃으로 바꿨습니다.

### 3. 에이전트 자산 보강

- 신규 에이전트: `shopping_fe/agents/fe_agents/csr-commerce-redesign-agent.md`
- 보고 에이전트 강화: `shopping_fe/agents/reporting-agent.md`
  - 결과 중심 요약
  - API 계약 유지 설명
  - 테스트/빌드 실제 결과 기입
  - 에러 감사 연결 요구사항 추가

## API와 상태 흐름에서 유지한 것

- 공개 데이터
  - `GET /api/items`
  - `GET /api/categories`
  - `GET /api/posts`
- 인증 및 세션
  - `POST /api/login`
  - `POST /api/logout`
  - `GET /api`
  - `GET /api/myPage`
  - `GET/POST/DELETE /api/cart...`
- 커뮤니티 상세/댓글
  - `GET /api/posts/{id}`
  - `POST/PUT/DELETE /api/posts/{postId}/comments...`

이번 리디자인에서 의도적으로 하지 않은 것:

- 상품-카테고리 매핑 DTO가 없으므로 실제 카테고리 필터 UI는 만들지 않음
- 백엔드에 없는 할인, 배송, 쿠폰, 판매량 랭킹은 사실처럼 표시하지 않음
- 기존 세션 기반 장바구니/로그인/`returnTo` 흐름은 그대로 유지

## 실행 방법

```bash
cd shopping_fe
npm install
npm run dev
```

개발 서버 기본 주소는 `http://localhost:5173`입니다. 백엔드와 함께 사용할 때는 Vite 프록시 또는 `VITE_API_BASE_URL` 설정이 기존 프로젝트 기준과 맞아야 합니다.

## 빌드와 테스트 결과

2026-03-13 기준 실행 결과:

- `npm test`
  - 통과
  - 5개 테스트 파일, 10개 테스트 통과
- `npm run build`
  - 통과
  - TypeScript 검사와 Vite 프로덕션 빌드 성공

비고:

- Vitest 실행 중 React Router v7 future flag 경고가 출력되지만 현재 실패 원인은 아니었습니다.
- CLI 환경이라 실제 브라우저 스크린샷 비교는 이번 산출물에 포함하지 않았습니다.

## 남은 제약과 후속 권장

- 장바구니 초기 조회 실패가 사용자에게 빈 장바구니처럼 보일 수 있어 별도 오류 배너가 있으면 좋습니다.
- 백엔드가 재고 초과를 400 빈 응답으로 돌려주는 경우, 현재 프론트에서는 메시지가 다소 일반적으로 보일 수 있습니다.
- Pre-signed 이미지 URL 만료 시간 이후 장시간 열어둔 탭은 새로고침 전까지 이미지가 깨질 수 있습니다.

자세한 감사 내용은 `shopping_fe/docs/csr-commerce-redesign-error-audit.md`에 정리했습니다.
