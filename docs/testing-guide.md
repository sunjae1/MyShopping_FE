# Frontend Testing Guide

이 문서는 `shopping_fe` 프런트엔드의 테스트를 처음 실행하는 사람 기준으로 정리한 안내서입니다.

## 1. 먼저 이해할 것

이 프로젝트 테스트는 크게 두 종류입니다.

- `src/test/*`
  - `Vitest + React Testing Library`
  - 빠른 단위 테스트, 컴포넌트 테스트, 프런트 내부 통합 테스트
- `e2e/*`
  - `Playwright`
  - 실제 브라우저를 띄워 사용자 흐름을 끝까지 검증하는 E2E 테스트

`e2e`가 `test` 폴더가 아니라 별도 폴더인 이유는 역할이 다르기 때문입니다.

- `src/test`는 프런트 코드 단위로 검증합니다.
- `e2e`는 브라우저, 라우팅, 화면 전환, 네트워크 모킹까지 포함합니다.
- Vitest가 Playwright 스펙을 읽어버리면 충돌하므로, 테스트 러너를 폴더로 분리하는 편이 가장 안전합니다.
- 현재 설정도 그 구조를 전제로 되어 있습니다.
  - Vitest 포함 범위: [vite.config.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/vite.config.ts)
  - Playwright 테스트 루트: [playwright.config.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/playwright.config.ts)

## 2. 실패 메시지 읽는 법

예를 들어 이런 로그가 나오면:

```text
1 failed
  [chromium] › e2e\refresh-lock.spec.ts:5:3 › refresh lock transport › shares a single refresh call across concurrent protected client requests
8 passed
```

뜻은 아래와 같습니다.

- 전체 E2E 중 9개가 실행됐다.
- 그중 8개는 통과했다.
- 1개는 실패했다.
- 실패한 테스트는 [refresh-lock.spec.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/e2e/refresh-lock.spec.ts)의 5번째 줄 근처에 있는 첫 번째 테스트다.
- `[chromium]`은 크로미움 브라우저 프로젝트에서 실패했다는 뜻이다.

이번 실패의 핵심 원인은 이 줄이었습니다.

```text
Expected: 1
Received: 2
```

즉 테스트는 "동시에 보호 API 두 개를 호출해도 refresh 요청은 1번만 나가야 한다"고 기대했는데, 실제 실행에서는 refresh가 2번 호출됐다는 뜻입니다.

이 케이스는 홈 화면 부트스트랩이 아직 끝나기 전에 토큰 만료를 강제로 걸면 간헐적으로 생길 수 있어서, 현재는 셸이 안정적으로 렌더된 뒤 만료를 걸도록 테스트를 보강했습니다.

## 3. 처음 실행할 때 순서

프로젝트 루트가 아니라 `shopping_fe`에서 실행합니다.

```powershell
cd shopping_fe
npm install
```

테스트를 실행하는 가장 기본 명령은 아래 4개입니다.

```powershell
npm run test
npm run test:watch
npm run test:e2e
npm run test:e2e:headed
```

각 명령의 의미는 이렇습니다.

- `npm run test`
  - Vitest를 1회 실행합니다.
  - 단위 테스트와 RTL 기반 통합 테스트를 돌립니다.
- `npm run test:watch`
  - 파일 변경을 감지하면서 Vitest를 계속 실행합니다.
  - UI 작업 중 빠르게 확인할 때 편합니다.
- `npm run test:e2e`
  - Playwright E2E를 headless 브라우저로 실행합니다.
  - 자동으로 dev server를 띄운 뒤 브라우저 테스트를 수행합니다.
- `npm run test:e2e:headed`
  - 브라우저 창이 실제로 보이는 상태로 실행합니다.
  - "진짜 화면이 어떻게 움직이는지" 눈으로 보고 싶을 때 씁니다.

## 4. 자주 쓰는 실행 예시

특정 Vitest 파일만 실행:

```powershell
npx vitest run src/test/session-shell.test.tsx
```

특정 Playwright 파일만 실행:

```powershell
npm run test:e2e -- e2e/refresh-lock.spec.ts
```

실패한 Playwright 테스트만 다시 실행:

```powershell
npx playwright test --last-failed
```

Playwright 리포트 보기:

```powershell
npx playwright show-report
```

실패 trace 열기:

```powershell
npx playwright show-trace .\test-results\<실패폴더>\trace.zip
```

테스트 이름으로 특정 시나리오만 실행:

```powershell
npx vitest run src/test/api-client-auth.test.ts -t "shares a single refresh lock"
npx playwright test e2e/refresh-lock.spec.ts -g "shares a single refresh call"
```

여기서 옵션 뜻은 아래와 같습니다.

- `-t`
  - Vitest의 테스트 이름 필터입니다.
  - `it("...")`, `test("...")` 이름에 들어 있는 문구로 특정 케이스만 실행합니다.
- `-g`
  - Playwright의 grep 필터입니다.
  - E2E 시나리오 이름에 들어 있는 문구로 특정 케이스만 실행합니다.

즉 프런트엔드 테스트는 파일 단위만 실행하는 것이 아니라, 테스트 케이스 이름 단위로도 실행할 수 있습니다.

## 4-1. IDE에서 왜 자바처럼 케이스별 Run 버튼이 안 보일 수 있나?

프런트엔드 테스트는 무조건 명령어로만 돌리는 것은 아닙니다.

- IDE 우클릭으로 파일 단위 실행이 가능한 경우가 많습니다.
- 환경이 잘 맞으면 `test(...)`, `it(...)` 옆에 케이스별 Run/Debug 버튼이 보일 수도 있습니다.
- 하지만 자바 JUnit처럼 항상 일관되게 보장되지는 않습니다.

그 이유는 프런트엔드 테스트 러너가 IDE에 기본 내장된 형태가 아니라, 도구별 통합 상태에 영향을 받기 때문입니다.

- Vitest는 별도 테스트 러너입니다.
- Playwright도 별도 테스트 러너입니다.
- VS Code 확장이나 JetBrains 플러그인 상태에 따라 케이스별 버튼 표시가 달라질 수 있습니다.

그래서 현재 네 환경처럼:

- 파일 단위 `Run Tests`는 보이는데
- 테스트 케이스별 버튼은 잘 안 보이는 상황

이건 충분히 흔한 상황입니다.

실무에서는 그래서 아래 둘을 같이 씁니다.

- IDE에서 파일 단위 실행
- 터미널에서 `-t`, `-g`로 시나리오 단위 실행

예를 들어:

```powershell
npx vitest run src/test/api-client-auth.test.ts -t "retries once after refresh succeeds"
npx playwright test e2e/auth-flow.spec.ts -g "redirects a guest to login" --headed
```

## 5. 현재 테스트 파일과 목적

### Vitest / RTL: `src/test`

- [auth.test.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/src/test/auth.test.ts)
  - 로그인 리다이렉트 경로 생성
  - unsafe `returnTo` 차단
- [format.test.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/src/test/format.test.ts)
  - 가격 포맷
  - 재고 문구
  - 이미지 fallback
- [api-client-auth.test.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/src/test/api-client-auth.test.ts)
  - JWT 로그인 응답 shape 처리
  - `401 -> refresh -> 재시도`
  - 동시 `401`에서 refresh lock 1회 보장
  - refresh 실패 시 auth-required 이벤트 1회 보장
  - 세션 부트스트랩 refresh 복구
- [home-page.test.tsx](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/src/test/home-page.test.tsx)
  - 홈 화면 검색
  - 히어로 안정성
  - 카탈로그 높이 유지와 스크롤 보정
- [product-card.test.tsx](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/src/test/product-card.test.tsx)
  - 상품 카드 렌더
  - 카드와 CTA가 동일 상세 경로로 이동하는지 확인
- [session-shell.test.tsx](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/src/test/session-shell.test.tsx)
  - 앱 시작 시 백엔드 연결 실패 처리
  - auth-required 이벤트 발생 시 세션 정리와 로그인 이동

### Playwright E2E: `e2e`

- [public-navigation.spec.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/e2e/public-navigation.spec.ts)
  - 홈 진입
  - 카탈로그 검색
  - 상품 상세 이동
  - 커뮤니티 공개 목록
  - 404 페이지
- [auth-flow.spec.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/e2e/auth-flow.spec.ts)
  - 비로그인 사용자의 보호 페이지 접근 차단
  - 로그인 후 원래 페이지 복귀
  - 회원가입 직후 로그인 상태 진입
  - 만료된 access token의 자동 refresh
- [commerce.spec.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/e2e/commerce.spec.ts)
  - 상품 상세에서 장바구니 담기
  - 주문 생성
  - 마이페이지 주문 내역 확인
  - 회원정보 수정
  - 로그아웃
- [community.spec.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/e2e/community.spec.ts)
  - 게시글 작성
  - 게시글 수정
  - 댓글 작성, 수정, 삭제
  - 게시글 삭제
- [refresh-lock.spec.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/e2e/refresh-lock.spec.ts)
  - 동시 보호 요청에서 refresh 1회만 발생하는지 검증
  - refresh 실패 시 로그인으로 보내는지 검증

## 6. E2E는 실제 브라우저를 보나?

네. Playwright는 실제 브라우저 엔진을 사용합니다.

- `npm run test:e2e`는 창을 띄우지 않는 headless 실행입니다.
- `npm run test:e2e:headed`는 실제 브라우저 창을 보면서 실행합니다.

즉 "변수만 보는 테스트"가 아니라, 클릭, 입력, 라우팅, 화면 표시까지 검증합니다.

다만 `headed`라고 해서 사람이 보기 좋게 천천히 실행되지는 않습니다.

- `--headed`는 브라우저 창을 보여주는 옵션입니다.
- 테스트 자체는 여전히 자동화 속도로 실행됩니다.
- 그래서 짧은 테스트는 창이 너무 빨리 지나가서 눈으로 확인하기 어렵습니다.

이건 정상 동작입니다.

눈으로 따라가며 확인하고 싶을 때는 아래 방법이 더 좋습니다.

- 특정 파일만 `headed`로 실행

```powershell
npm run test:e2e -- e2e/auth-flow.spec.ts --headed
```

- 특정 테스트 이름만 골라 실행

```powershell
npx playwright test e2e/auth-flow.spec.ts -g "redirects a guest to login" --headed
```

- 병렬도를 줄여서 덜 정신없게 실행

```powershell
npx playwright test --headed --workers=1
```

- 가장 추천: 디버그 모드로 실행

```powershell
npx playwright test e2e/auth-flow.spec.ts --debug
```

`--debug`를 쓰면 Playwright Inspector가 열리고, 실행을 멈추거나 단계적으로 보면서 확인할 수 있습니다. 사람이 실제로 흐름을 따라가며 보기에는 `--headed`보다 `--debug`가 훨씬 유용합니다.

정말 잠깐 멈춤이 필요하면 테스트 코드 안에 아래처럼 디버깅용 대기를 넣을 수도 있습니다.

```ts
await page.waitForTimeout(1000);
```

다만 이 방식은 테스트를 느리게 만들기 때문에, 원인 분석이 끝나면 제거하는 편이 좋습니다.

다만 현재 E2E는 실제 Spring Boot 서버를 직접 붙이는 방식이 아니라, [mockApi.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/e2e/fixtures/mockApi.ts)로 `/api/**`를 브라우저 레벨에서 모킹하는 구조입니다. 그래서 프런트 사용자 흐름은 빠르게 검증할 수 있고, 백엔드 실서버 연동 E2E는 다음 단계로 별도 프로필을 두는 것이 좋습니다.

## 7. 현재 설정 파일

- 테스트 스크립트: [package.json](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/package.json)
- Vitest 설정: [vite.config.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/vite.config.ts)
- Playwright 설정: [playwright.config.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/playwright.config.ts)
- E2E API 모킹: [mockApi.ts](/C:/Users/kimsunjae/Desktop/NewFolder/Java_INTELLIJ/MyProject/shopping/shopping_fe/e2e/fixtures/mockApi.ts)

## 8. 현재 추천 실행 순서

개발 중에는 아래 순서가 가장 무난합니다.

1. `npm run test`
2. `npm run test:e2e`
3. 실패가 있으면 `npm run test:e2e -- e2e/<파일명>`
4. 화면으로 보고 싶으면 `npm run test:e2e:headed`

## 9. 이번 보고

현재 기준 테스트 스위트는 아래처럼 보는 것이 맞습니다.

- 빠른 로직 검증: `Vitest + RTL`
- 실제 사용자 흐름 검증: `Playwright E2E`
- 백엔드 실연동 검증: 아직 별도 환경 미구성

이번에 `refresh-lock` E2E는 홈 부트스트랩 완료 후 토큰 만료를 걸도록 안정화했습니다.
