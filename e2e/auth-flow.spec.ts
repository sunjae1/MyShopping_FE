import { expect, test } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi";

test.describe("auth flow", () => {
  test("redirects a guest to login and returns to the protected route after login", async ({
    page
  }) => {
    await installMockApi(page);

    await page.goto("/account?tab=security");

    await expect(page).toHaveURL(
      /\/login\?returnTo=%2Faccount%3Ftab%3Dsecurity&reason=auth$/
    );

    await page.getByLabel("이메일").fill("member@example.com");
    await page.getByLabel("비밀번호").fill("password123!");
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page).toHaveURL(/\/account\?tab=security$/);
    await expect(page.getByRole("heading", { level: 1, name: "마이페이지" })).toBeVisible();
    await expect(page.locator(".session-chip").getByText("멤버 님")).toBeVisible();
  });

  test("registers a new user and signs in immediately", async ({ page }) => {
    await installMockApi(page);

    await page.goto("/register");

    await page.getByLabel("이름").fill("신규회원");
    await page.getByLabel("이메일").fill("fresh@example.com");
    await page.getByLabel("비밀번호").fill("abc123");
    await page.getByRole("button", { name: "회원가입" }).click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.locator(".session-chip").getByText("신규회원 님")).toBeVisible();
  });

  test("silently refreshes an expired access token on bootstrap", async ({ page }) => {
    await installMockApi(page, {
      startAuthenticated: true,
      startExpired: true
    });

    await page.goto("/account");

    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { level: 1, name: "마이페이지" })).toBeVisible();
    await expect(page.locator(".session-chip").getByText("멤버 님")).toBeVisible();
  });
});
