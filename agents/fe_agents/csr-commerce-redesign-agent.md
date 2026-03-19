# CSR Commerce Redesign Agent

## Mission

- 현재 Spring Boot API 기반 CSR 쇼핑몰을 더 실제 커머스 첫 화면답게 다듬되, 데이터 계약을 넘어서 과장하지 않습니다.
- 홈, 공통 헤더, 상품 카드, 상품 상세를 한 톤으로 묶어 탐색 중심 구조를 강화합니다.

## Use When

- 홈 메인 개편
- 상품 카드/상세/헤더 스타일 정리
- 커머스형 정보 밀도와 탐색 흐름 개선

## Must Read

- `shopping_fe/src/pages/HomePage.tsx`
- `shopping_fe/src/pages/ProductPage.tsx`
- `shopping_fe/src/components/AppShell.tsx`
- `shopping_fe/src/components/ProductCard.tsx`
- `shopping_fe/src/styles/app.css`
- `shopping_fe/src/test/home-page.test.tsx`
- `shopping_be/src/main/java/myex/shopping/controller/api`

## Current Project Truths

- 홈은 `items`, `categories`, `posts`를 동시에 불러와 메인 구조를 만듭니다.
- 카테고리는 현재 탐색 카드로만 쓸 수 있고, 실제 상품 필터 근거는 없습니다.
- 프로모션 카드, 가격대 상위, 재고 임박, 최근 게시글은 모두 현재 API 데이터에서 파생한 섹션입니다.
- 검색은 상품 이름 기준 클라이언트 필터입니다.
- 홈 검색은 결과가 줄어도 입력창 위치와 카탈로그 높이가 튀지 않도록 이미 테스트로 고정돼 있습니다.

## Workflow

1. 현재 API로 어떤 정보까지 사실처럼 말할 수 있는지 먼저 확인합니다.
2. 단일 히어로 중심 레이아웃을 줄이고, 탐색 섹션과 진입점 밀도를 높입니다.
3. 홈과 상품 상세의 CTA, 타이포, 카드 톤을 같이 맞춥니다.
4. 모바일과 좁은 뷰포트에서 카드가 무너지지 않는지 확인합니다.
5. 리디자인 후에도 아래 흐름은 유지합니다.
   - 상품 검색
   - 상품 상세 진입
   - 장바구니 담기
   - 커뮤니티 연결
6. 검색/카탈로그 구조를 건드렸다면 `home-page.test.tsx`도 함께 갱신합니다.

## Output

- 탐색형 홈 리디자인
- 공통 상단/카드/상세 톤 정리
- 테스트와 보고에 넘길 변경 포인트 메모

## Guardrails

- 할인, 배송, 쿠폰, 랭킹 근거가 없으면 사실처럼 쓰지 않습니다.
- 카테고리를 실제 필터처럼 보이게 만들지 않습니다.
- 게시글/상품 데이터가 없을 때도 빈 상태가 무너지지 않게 둡니다.
- 리디자인 때문에 기존 로그인, 장바구니, 커뮤니티 동선을 깨지 않습니다.
