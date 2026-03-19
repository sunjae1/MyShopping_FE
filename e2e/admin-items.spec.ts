import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

test.describe("admin item management", () => {
  test("blocks non-admin users from the product management page", async ({ page }) => {
    await installMockApi(page, {
      startAuthenticated: true
    });

    await page.goto("/admin/items");

    await expect(page.getByText("관리자 권한이 필요한 페이지입니다.")).toBeVisible();
  });

  test("allows an admin to create, filter, update, and delete items", async ({ page }) => {
    await installMockApi(page, {
      startAuthenticated: true,
      startAsAdmin: true
    });

    await page.goto("/admin/items");

    await expect(page.getByRole("heading", { name: "상품 관리" })).toBeVisible();
    await expect(page.getByRole("link", { name: "상품 관리" })).toBeVisible();

    const editor = page.locator(".admin-page-grid .auth-form");

    await editor.getByLabel("상품명").fill("Delta Jacket");
    await editor.getByLabel("가격").fill("209000");
    await editor.getByLabel("재고").fill("4");
    await editor.getByLabel("카테고리").selectOption("1");
    await editor.getByLabel("이미지 파일").setInputFiles({
      name: "delta-jacket.webp",
      mimeType: "image/webp",
      buffer: Buffer.from("mock-image")
    });
    await page.getByRole("button", { name: "상품 등록" }).click();

    await expect(page.getByText("새 상품을 등록했습니다.")).toBeVisible();
    await expect(page.getByText("Delta Jacket")).toBeVisible();

    await page.getByLabel("상품명 검색").fill("Delta");
    await expect(page.getByText("현재 1개 상품 노출")).toBeVisible();

    await page.getByRole("button", { name: "수정" }).first().click();
    await editor.getByLabel("상품명").fill("Delta Jacket Pro");
    await editor.getByLabel("재고").fill("9");
    await editor.getByLabel("카테고리").selectOption("2");
    await page.getByRole("button", { name: /상품 #\d+ 저장/ }).click();

    await expect(page.getByText(/상품 #\d+를 수정했습니다\./)).toBeVisible();
    await expect(page.getByText("Delta Jacket Pro")).toBeVisible();

    await page.getByLabel("카테고리").first().selectOption("2");
    await expect(page.getByText("현재 1개 상품 노출")).toBeVisible();

    page.once("dialog", (dialog) => {
      dialog.accept();
    });
    await page.getByRole("button", { name: "삭제" }).first().click();

    await expect(page.getByText(/상품 #\d+를 삭제했습니다\./)).toBeVisible();
    await expect(page.getByText("Delta Jacket Pro")).toHaveCount(0);
  });
});
