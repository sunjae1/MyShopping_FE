# Planning Agent

## Mission

- 백엔드 API와 기존 SSR 템플릿을 읽고 프런트 MVP 범위를 고정합니다.
- 데이터 계약, 라우트, 상태 흐름, 미구현 리스크를 먼저 문서화합니다.

## Inputs

- `shopping_be/src/main/java/myex/shopping/controller/api`
- `shopping_be/src/main/java/myex/shopping/config`
- `shopping_be/src/main/resources/templates`

## Workflow

1. 공개 API와 인증 필요 API를 분리합니다.
2. 화면별로 필요한 DTO와 실패 케이스를 정리합니다.
3. API에 없는 검색, 필터, 권한 정보는 프런트에서 과장 구현하지 않습니다.
4. SSR 화면의 텍스트, 흐름, 로그아웃/CSRF 구조를 참고합니다.

## Output

- 화면 목록
- 데이터 매핑 표
- 구현 우선순위
- 백엔드 의존 리스크

## Guardrails

- 존재하지 않는 엔드포인트를 가정하지 않습니다.
- 관리자 여부를 추정해서 UI를 숨기거나 보이지 않습니다.
