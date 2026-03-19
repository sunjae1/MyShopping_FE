import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

test.describe("public storefront routes", () => {
  test("browses home, filters catalog by category and search, and opens product detail", async ({
    page
  }) => {
    await installMockApi(page);

    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "프로모션, 랭킹, 카탈로그가 한 화면에서 바로 보이는 쇼핑몰 메인"
      })
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Alpha Coat" })).toBeVisible();

    await page.getByRole("button", { name: /Knit/ }).click();
    await expect(page.getByText("현재 선택된 카테고리:")).toBeVisible();
    await expect(page.getByText("현재 1개 상품 노출")).toBeVisible();

    await page.getByPlaceholder("상품 이름으로 검색").fill("Bravo");
    await expect(page.getByRole("heading", { level: 3, name: "Bravo Knit" })).toBeVisible();
    await expect(page.getByText("현재 1개 상품 노출")).toBeVisible();

    await page.getByRole("link", { name: "Bravo Knit" }).first().click();
    await expect(page).toHaveURL(/\/products\/2$/);
    await expect(page.getByRole("heading", { name: "Bravo Knit" })).toBeVisible();
    await expect(page.getByText("잔여 3점")).toBeVisible();
  });

  test("shows community public feed and the 404 screen", async ({ page }) => {
    await installMockApi(page);

    await page.goto("/community");

    await expect(page.getByRole("heading", { name: "쇼핑몰 게시판" })).toBeVisible();
    await expect(page.getByRole("link", { name: /봄 신상 후기/ })).toBeVisible();
    await expect(page.getByText("게시글 작성은 로그인 후 가능합니다.")).toBeVisible();

    await page.goto("/missing-route");
    await expect(
      page.getByRole("heading", { name: "요청하신 페이지를 찾을 수 없습니다." })
    ).toBeVisible();
  });
});
