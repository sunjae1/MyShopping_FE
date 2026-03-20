# Community Flow Agent

## Mission

- 게시글 목록, 상세, 작성, 수정, 삭제, 댓글 흐름을 현재 백엔드 계약에 맞게 유지하거나 개선합니다.
- 공개 읽기와 로그인 사용자 쓰기 흐름을 혼동하지 않게 만듭니다.

## Use When

- `CommunityPage.tsx`, `CommunityDetailPage.tsx`, 게시글/댓글 API 클라이언트를 수정할 때
- 게시글 권한, 댓글 폼, 상세 화면 오류를 다룰 때

## Must Read

- `shopping_fe/src/pages/CommunityPage.tsx`
- `shopping_fe/src/pages/CommunityDetailPage.tsx`
- `shopping_fe/src/api/client.ts`
- `shopping_fe/src/api/types.ts`
- `shopping_be/src/main/java/myex/shopping/controller/api/ApiPostController.java`
- `shopping_be/src/main/java/myex/shopping/controller/api/ApiCommentController.java`

## Current Project Truths

- 게시글 목록과 상세는 비로그인 상태에서도 볼 수 있습니다.
- 게시글 작성/수정/삭제와 댓글 작성/수정/삭제는 로그인 필요입니다.
- 댓글 작성/수정은 `reply_content` `requestParam`으로 전송해야 합니다.
- 게시글 응답은 `author` 또는 `authorName` 중 하나로 들어올 수 있어 프런트에서 정규화합니다.
- 작성자 ID가 없어 수정/삭제 버튼 노출은 현재 이름 문자열 비교에 의존합니다.
- 403은 "권한 없음", 401은 "로그인 필요"로 의미가 다릅니다.

## Workflow

1. 게시글과 댓글 응답 shape 를 먼저 확인하고 정규화 포인트를 점검합니다.
2. 비로그인 읽기, 로그인 쓰기 경계를 흐리지 않게 UI를 구성합니다.
3. 작성/수정/삭제 동작은 낙관적 갱신보다 현재 코드 흐름과 일관성을 우선합니다.
4. 401은 로그인 이동 흐름, 403은 사용자 메시지 노출 흐름이 분리되어 있는지 확인합니다.
5. 소유자 UI는 현재 제약을 넘어서 과장하지 않습니다.
6. 동작을 바꾸면 커뮤니티 관련 테스트 후보를 함께 남깁니다.

## Output

- 게시글/댓글 흐름 개선
- 필요한 API 정규화 또는 오류 처리 개선
- 테스트와 에러 감사에 넘길 포인트

## Guardrails

- 댓글 payload를 JSON으로 바꾸지 않습니다.
- 작성자 ID가 없는 상태에서 권한 판단을 더 정확한 것처럼 꾸미지 않습니다.
- 공개 읽기 가능 화면을 불필요하게 보호 라우트로 감싸지 않습니다.
- 목록과 상세에서 응답 필드 이름 차이를 놓치지 않습니다.
- 커뮤니티 흐름 관련 보고서/체크리스트 Markdown 파일은 프로젝트 루트 `codex_reports/`에만 저장합니다.
