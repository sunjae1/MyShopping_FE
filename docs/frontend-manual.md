# 쇼핑몰 FE 실행 설명서

이 문서는 프런트를 처음 하는 사람 기준으로 작성했습니다.

## 1. 준비물

- Node.js 22 이상
- npm 10 이상
- 백엔드 서버 실행 상태

현재 프런트는 Vite 개발 서버를 쓰고, 개발 중 API 요청은 프록시로 백엔드에 전달합니다.

## 2. 백엔드 먼저 실행하기

1. `shopping_be` 프로젝트를 IntelliJ에서 엽니다.
2. Spring Boot 애플리케이션을 실행합니다.
3. 기본 기준은 `http://localhost:8080` 입니다.

프런트는 `/api`, `/image` 요청을 백엔드로 넘깁니다.

## 3. 프런트 폴더 위치

프런트 폴더는 아래 경로입니다.

`C:\Users\kimsunjae\Desktop\NewFolder\Java_INTELLIJ\MyProject\shopping\shopping_fe`

## 4. 처음 한 번 설치

터미널에서 `shopping_fe`로 이동한 뒤:

```bash
npm install
```

## 5. 개발 서버 실행

```bash
npm run dev
```

실행 후 브라우저에서 기본 주소:

`http://localhost:5173`

## 6. 환경 변수

백엔드 주소가 다르면 `.env.example`을 복사해서 `.env`를 만들고 값을 바꾸면 됩니다.

```env
VITE_PROXY_TARGET=http://localhost:8080
```

예를 들어 백엔드가 9090이면:

```env
VITE_PROXY_TARGET=http://localhost:9090
```

## 7. 로그인 방법

이 프런트는 Spring Security JSON 로그인 엔드포인트를 사용합니다.

- 로그인 API: `POST /api/login`
- 회원가입 API: `POST /api/register`
- 로그아웃 API: `POST /api/logout`

로그아웃은 `POST /api/logout`으로 처리하고, 성공하면 홈(`/`)으로 이동합니다.

## 8. 테스트 실행

```bash
npm run test
```

현재 포함된 테스트:

- 인증 경로/returnTo 유틸 테스트
- 금액/재고 포맷 테스트
- 상품 카드 렌더 테스트

## 9. 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `shopping_fe/dist`에 생성됩니다.

## 10. 자주 헷갈리는 문제

### 상품은 보이는데 장바구니가 안 되는 경우

로그인이 안 된 상태일 가능성이 큽니다.  
장바구니와 주문은 인증이 필요합니다.  
보호 기능에서 401이 발생하면 로그인 페이지로 이동하고, 로그인 후 원래 페이지로 돌아옵니다.

### 로그인은 됐는데 요청이 이상한 경우

백엔드가 실제로 실행 중인지 먼저 확인하세요.

### 이미지가 안 보이는 경우

개발 환경에서는 `/image/**` 요청도 프록시로 백엔드에 전달됩니다.  
백엔드 정적 리소스 경로가 바뀌면 프런트 이미지도 깨질 수 있습니다.

### 다른 도메인에서 프런트를 따로 배포하고 싶은 경우

지금 구조는 개발 프록시 또는 같은 도메인 배포를 전제로 합니다.  
완전 분리 배포를 하려면 백엔드에 CORS와 쿠키 정책을 추가로 맞춰야 합니다.

## 11. 실제 실행 순서 요약

1. 백엔드 실행
2. `shopping_fe`에서 `npm install`
3. `shopping_fe`에서 `npm run dev`
4. 브라우저에서 `http://localhost:5173` 접속
