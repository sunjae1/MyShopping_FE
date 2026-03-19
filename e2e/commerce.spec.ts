import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

test.describe("commerce flows", () => {
  test("adds a product to cart, checks out, updates profile, and logs out", async ({
    page
  }) => {
    await installMockApi(page, {
      startAuthenticated: true
    });

    await page.goto("/products/1");

    await expect(page.getByRole("heading", { name: "Alpha Coat" })).toBeVisible();
    await page.getByRole("button", { name: "수량 증가" }).click();
    await page.getByRole("button", { name: "장바구니에 담기" }).click();

    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("heading", { name: "장바구니" })).toBeVisible();
    await expect(page.getByText("Alpha Coat")).toBeVisible();
    await expect(page.getByText("수량 2")).toBeVisible();
    await expect(
      page.locator(".cart-summary").getByRole("heading", { name: /₩378,000/ })
    ).toBeVisible();

    await page.getByRole("button", { name: "지금 주문하기" }).click();
    await expect(page.getByText("주문이 완료되었습니다. 주문 번호 #1")).toBeVisible();

    await page.getByRole("link", { name: "마이페이지" }).click();
    await expect(page.getByText("주문 #1")).toBeVisible();
    await expect(page.getByText("Alpha Coat x 2")).toBeVisible();

    await page.getByLabel("이름").fill("리뉴얼회원");
    await page.getByLabel("이메일").fill("renewed@example.com");
    await page.getByRole("button", { name: "정보 저장" }).click();
    await expect(page.locator(".session-chip").getByText("리뉴얼회원 님")).toBeVisible();

    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
  });
});
