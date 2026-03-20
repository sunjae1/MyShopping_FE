import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

test.describe("community flows", () => {
  test("allows an authenticated member to create, edit, comment on, and delete a post", async ({
    page
  }) => {
    await installMockApi(page, {
      startAuthenticated: true
    });
    await page.setViewportSize({ width: 900, height: 900 });

    await page.goto("/community");

    await page.getByRole("button", { name: "글쓰기" }).click();
    await expect(page.locator("#community-write")).toBeInViewport();
    await expect(page.locator("#community-write")).toHaveClass(/community-write-highlighted/);
    await expect(page.getByRole("heading", { level: 2, name: "오늘의 이야기 남기기" })).toBeVisible();

    await page.getByLabel("제목").fill("E2E 게시글");
    await page.getByLabel("내용").fill("브라우저 수준으로 커뮤니티 흐름을 검증합니다.");
    await page.getByRole("button", { name: "이야기 올리기" }).click();

    await expect(page.getByText("새 게시글을 등록했습니다.")).toBeVisible();
    await page.getByRole("link", { name: /E2E 게시글/ }).first().click();

    await expect(page.getByRole("heading", { name: "E2E 게시글" })).toBeVisible();
    await page.getByRole("button", { name: "수정하기" }).click();
    await page.getByLabel("제목").fill("E2E 게시글 수정");
    await page.getByLabel("내용").fill("수정된 본문입니다.");
    await page.getByRole("button", { name: "저장" }).click();

    await expect(page.getByText("게시글을 수정했습니다.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E 게시글 수정" })).toBeVisible();

    await page.getByLabel("댓글 남기기").fill("첫 번째 댓글");
    await page.getByRole("button", { name: "댓글 남기기" }).click();
    await expect(page.getByText("댓글을 등록했습니다.")).toBeVisible();
    await expect(page.getByText("첫 번째 댓글")).toBeVisible();

    await page.getByRole("button", { name: "수정" }).last().click();
    await page.locator(".comment-card textarea").fill("수정된 댓글");
    await page.getByRole("button", { name: "댓글 저장" }).click();
    await expect(page.getByText("댓글을 수정했습니다.")).toBeVisible();
    await expect(page.getByText("수정된 댓글")).toBeVisible();

    await page.getByRole("button", { name: "삭제" }).last().click();
    await page.getByRole("button", { name: "댓글 삭제" }).click();
    await expect(page.getByText("댓글을 삭제했습니다.")).toBeVisible();

    await page.getByRole("button", { name: "삭제하기" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("게시글을 삭제할까요?")).toBeVisible();
    await page.getByRole("button", { name: "게시글 삭제" }).click();
    await expect(page).toHaveURL(/\/community$/);
    await expect(page.getByText("E2E 게시글 수정")).toHaveCount(0);
  });
});
