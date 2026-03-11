# Shopping FE Agents

`shopping_fe` 작업은 아래 에이전트 순서로 진행합니다.

1. `planning-agent.md`
2. `implementation-agent.md`
3. `testing-agent.md`
4. `reporting-agent.md`
5. `error-audit-agent.md`

운영 원칙:

- 백엔드 API에 없는 기능은 만들지 않는다.
- 세션 기반 인증과 `/api/login` JSON 로그인을 우선 기준으로 삼는다.
- 개발 환경에서는 프런트 dev server 프록시를 통해 백엔드와 통신한다.
- SSR 템플릿은 디자인 레퍼런스와 기존 화면 흐름 확인용으로만 참고한다.
- 로그아웃은 `/api/logout` 기준으로 맞춘다.
- 결과물은 항상 실행 방법 문서와 함께 남긴다.
