import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

test.describe("refresh lock transport", () => {
  test("shares a single refresh call across concurrent protected client requests", async ({
    page
  }) => {
    const mockApi = await installMockApi(page, {
      startAuthenticated: true
    });

    await page.goto("/");
    await expect(page.locator(".session-chip").getByText("멤버 님")).toBeVisible();

    mockApi.expireAccess();

    const result = await page.evaluate(async () => {
      const client = await import("/src/api/client.ts");
      const [myPage, cart] = await Promise.all([
        client.fetchMyPage(),
        client.fetchCart()
      ]);

      return {
        userEmail: myPage.user.email,
        cartTotal: cart.allPrice
      };
    });

    expect(result).toEqual({
      userEmail: "member@example.com",
      cartTotal: 0
    });
    expect(mockApi.getRefreshCount()).toBe(1);
  });

  test("redirects to login when refresh fails during a protected page visit", async ({
    page
  }) => {
    const mockApi = await installMockApi(page, {
      startAuthenticated: true
    });

    await page.goto("/");

    mockApi.expireAccess();
    mockApi.failNextRefresh();

    await page.goto("/account");

    await expect(page).toHaveURL(/\/login\?returnTo=%2Faccount&reason=auth$/);
    await expect(page.getByRole("heading", { name: "JWT 쿠키 기반 로그인" })).toBeVisible();
  });
});
