# CSR Commerce Redesign Error Audit

작성일: 2026-03-13

## 범위

- 프론트 리디자인 이후에도 기존 세션 인증, 장바구니, 마이페이지, 커뮤니티 흐름이 백엔드 계약과 충돌하지 않는지 점검
- 기준 파일
  - `shopping_fe/src/api/client.ts`
  - `shopping_fe/src/contexts/SessionContext.tsx`
  - `shopping_fe/src/contexts/CartContext.tsx`
  - `shopping_fe/src/pages/HomePage.tsx`
  - `shopping_fe/src/pages/CommunityDetailPage.tsx`
  - `shopping_be/src/main/java/myex/shopping/controller/api/*`
  - `shopping_be/src/main/java/myex/shopping/config/SecurityConfig.java`

## 확인 결과

다음 항목은 현재 구현이 백엔드 계약을 잘 반영하고 있습니다.

- `/api/login` 이후 `refreshSession()`으로 세션 사용자 정보를 다시 확인하는 흐름 유지
- `/api/logout`이 `204 No Content`여도 프론트가 정상 처리
- 보호 API의 401이 로그인 페이지와 `returnTo` 흐름으로 연결됨
- 댓글 생성/수정이 `reply_content` request param 기반이라는 점을 반영
- 카테고리 API를 실제 상품 필터처럼 오해시키지 않도록 홈 문구와 구조를 조정
- 상품/장바구니 이미지가 현재 백엔드의 pre-signed absolute URL 정책과는 잘 맞음

## 잠재 오류 목록

### 중간

#### 1. 장바구니 초기 조회 실패가 빈 장바구니처럼 보일 수 있음

- 근거
  - `shopping_fe/src/contexts/CartContext.tsx`의 초기 `refreshCart()` 실패는 `catch(() => undefined)`로 삼켜집니다.
  - `shopping_fe/src/pages/CartPage.tsx`는 이 실패를 사용자 메시지로 노출하지 않고 빈 장바구니 상태를 그릴 수 있습니다.
- 영향 범위
  - 로그인한 사용자가 백엔드 장애 또는 일시적 네트워크 문제 상황에서 장바구니를 비어 있다고 오해할 수 있습니다.
  - 주문 직전 사용자 혼란과 지원 문의 가능성이 있습니다.
- 우회책
  - 페이지 새로고침 후 백엔드 복구 상태를 다시 확인합니다.
- 권장 보완
  - `CartContext`에 `cartError` 상태를 추가하고 `CartPage` 또는 `AppShell`에 배너를 띄웁니다.

#### 2. Pre-signed 이미지 URL 만료 후 장시간 열린 탭에서 이미지가 깨질 수 있음

- 근거
  - `shopping_be/src/main/java/myex/shopping/service/ImageService.java`는 기본 60분짜리 pre-signed URL을 생성합니다.
  - 프론트는 상품/장바구니 데이터를 최초 로드 후 장시간 재호출하지 않으면 만료된 URL을 계속 사용합니다.
- 영향 범위
  - 홈, 상품 상세, 장바구니, 마이페이지 이미지가 장시간 세션에서 깨질 수 있습니다.
- 우회책
  - 새로고침 또는 해당 페이지 재진입
- 권장 보완
  - 이미지 만료 시간을 늘리거나, 장시간 체류 화면에서 주기적 데이터 재요청 전략을 둡니다.

### 낮음

#### 3. 재고 초과/없는 상품 응답이 사용자에게 너무 일반적인 오류로 보일 수 있음

- 근거
  - `shopping_be/src/main/java/myex/shopping/controller/api/ApiCartController.java`는 재고 초과와 일부 오류에 대해 `400` 또는 `404`를 빈 본문으로 반환합니다.
  - 프론트 `toAppErrorMessage()`는 본문이 없으면 일반 메시지로 떨어집니다.
- 영향 범위
  - 사용자는 "재고 부족"과 "상품 없음"을 구분하기 어렵습니다.
- 우회책
  - 사용자가 수량을 줄이거나 페이지를 새로고침하도록 안내
- 권장 보완
  - 백엔드가 에러 본문을 내려주거나, 프론트가 `status`별 고정 메시지를 더 자세히 매핑합니다.

#### 4. 프론트의 이미지 URL 헬퍼는 백엔드가 항상 정규화해 준다는 가정에 의존함

- 근거
  - `shopping_fe/src/lib/format.ts`의 `resolveImageUrl()`는 값이 있으면 그대로 반환합니다.
  - 현재는 백엔드가 item/cart DTO에서 pre-signed absolute URL을 주므로 문제 없지만, 향후 raw key나 상대 경로가 직접 내려오면 중첩 라우트에서 깨질 수 있습니다.
- 영향 범위
  - 신규 API 또는 일부 DTO 누락 시 이미지 경로 오작동 가능
- 우회책
  - 백엔드에서 모든 item/cart DTO 이미지 URL을 계속 정규화
- 권장 보완
  - 프론트에서 `/`, `http`, `https`가 아닌 경우 보정하는 방어 로직 추가

## 결론

이번 리디자인 자체가 인증/댓글/카테고리 계약을 새로 깨지는 않았습니다. 다만 장바구니 초기 오류 노출, 이미지 URL 만료, 장바구니 오류 메시지의 구체성은 운영 단계에서 먼저 보완할 가치가 있습니다.
