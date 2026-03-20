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
        name: "지금 가장 마음에 드는 셀렉션을 만나보세요"
      })
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Alpha Coat" })).toBeVisible();

    await page.getByRole("button", { name: /Knit/ }).click();
    await expect(page.getByText("지금 보고 있는 카테고리: Knit")).toBeVisible();
    await expect(page.getByText("총 1개 상품")).toBeVisible();

    await page.getByPlaceholder("상품 이름으로 검색").fill("Bravo");
    await expect(page.getByRole("heading", { level: 3, name: "Bravo Knit" })).toBeVisible();
    await expect(page.getByText("총 1개 상품")).toBeVisible();

    await page.getByRole("link", { name: "Bravo Knit" }).first().click();
    await expect(page).toHaveURL(/\/products\/2$/);
    await expect(page.getByRole("heading", { name: "Bravo Knit" })).toBeVisible();
    await expect(page.getByText("잔여 3점")).toBeVisible();
  });

  test("shows community public feed and the 404 screen", async ({ page }) => {
    await installMockApi(page);

    await page.goto("/community");

    await expect(page.getByRole("heading", { name: "스타일 커뮤니티" })).toBeVisible();
    await expect(page.getByRole("link", { name: /봄 신상 후기/ })).toBeVisible();
    await expect(
      page.getByText("로그인 후 스타일 팁이나 쇼핑 후기를 남길 수 있습니다.")
    ).toBeVisible();

    await page.goto("/missing-route");
    await expect(
      page.getByRole("heading", { name: "찾으시는 페이지가 보이지 않습니다." })
    ).toBeVisible();
  });
});
