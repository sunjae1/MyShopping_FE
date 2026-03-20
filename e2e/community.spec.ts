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

  test("keeps the detail page wrapped when title and content are filled to the maximum length", async ({
    page
  }) => {
    await installMockApi(page, {
      startAuthenticated: true
    });
    await page.setViewportSize({ width: 1440, height: 900 });

    const longTitle = "A".repeat(80);
    const longContent = "B".repeat(2000);

    await page.goto("/community");
    await page.getByRole("button", { name: "글쓰기" }).click();
    await page.getByLabel("제목").fill(longTitle);
    await page.getByLabel("내용").fill(longContent);
    await page.getByRole("button", { name: "이야기 올리기" }).click();

    await expect(page.getByText("새 게시글을 등록했습니다.")).toBeVisible();
    await page.getByRole("link", { name: longTitle }).first().click();

    await expect(page.getByRole("heading", { level: 1, name: longTitle })).toBeVisible();

    const headingUsesResetSpacing = await page
      .getByRole("heading", { level: 1, name: longTitle })
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return style.marginTop === "0px" && style.marginBottom === "0px";
      });
    const pageFitsViewport = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      return root.scrollWidth <= root.clientWidth + 1;
    });
    const detailCardFitsViewport = await page.locator(".post-detail-card").evaluate((element) => {
      return element.scrollWidth <= element.clientWidth + 1;
    });
    const backLinkKeepsItsWidth = await page
      .getByRole("link", { name: "목록 보기" })
      .evaluate((element) => {
        return element.clientWidth > element.clientHeight;
      });

    expect(headingUsesResetSpacing).toBe(true);
    expect(pageFitsViewport).toBe(true);
    expect(detailCardFitsViewport).toBe(true);
    expect(backLinkKeepsItsWidth).toBe(true);
  });
});
