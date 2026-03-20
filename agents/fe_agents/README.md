# FE Feature Agents

`shopping_fe/agents/fe_agents`는 화면이나 도메인 단위로 바로 호출할 수 있는 기능형 에이전트 모음입니다.

## Available Agents

- `csr-commerce-redesign-agent.md`
  - 홈, 헤더, 상품 카드, 상품 상세를 커머스형으로 리디자인할 때 사용
- `auth-contract-agent.md`
  - 로그인, 로그아웃, 인증 확인, 보호 라우트, `returnTo` 흐름을 맞출 때 사용
- `community-flow-agent.md`
  - 게시글/댓글 CRUD와 권한 흐름을 다룰 때 사용

## Usage Order

1. 먼저 `../planning-agent.md`로 현재 계약과 범위를 정리합니다.
2. 작업 대상이 명확하면 해당 기능형 에이전트를 호출합니다.
3. 구현 후 `../testing-agent.md`, `../error-audit-agent.md`, `../reporting-agent.md` 순으로 넘깁니다.
4. 작업 중 보고서/계획서/로드맵/체크리스트 Markdown 파일이 필요하면 결과는 프로젝트 루트 `codex_reports/`에만 저장합니다.

## Rule Of Thumb

- 인증 이슈가 보이면 `auth-contract-agent.md`
- 홈/카탈로그/상세 리디자인이면 `csr-commerce-redesign-agent.md`
- 게시판과 댓글이면 `community-flow-agent.md`
- 그 외 공통 구조 변경은 기본 워크플로 에이전트를 우선합니다.
