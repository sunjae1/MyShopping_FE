import { expect, test, type Locator, type Page } from "@playwright/test";
import type { MockApiOptions } from "./fixtures/mockApi";
import {
  blurActiveElement,
  openVisualHome,
  openVisualRoute,
  visualScreenshotOptions,
  waitForVisualStability
} from "./fixtures/visual";

interface RouteScenario {
  name: string;
  path: string;
  screenshot: string;
  mock?: MockApiOptions;
  ready: (page: Page) => Locator;
}

const routeScenarios: RouteScenario[] = [
  {
    name: "login page shell",
    path: "/login",
    screenshot: "route-login-shell.png",
    ready: (page) => page.getByRole("heading", { level: 1, name: "다시 만나 반가워요" })
  },
  {
    name: "register page shell",
    path: "/register",
    screenshot: "route-register-shell.png",
    ready: (page) => page.getByRole("heading", { level: 1, name: "새 멤버로 시작하기" })
  },
  {
    name: "product detail route",
    path: "/products/1",
    screenshot: "route-product-detail.png",
    ready: (page) => page.getByRole("heading", { level: 1, name: "Alpha Coat" })
  },
  {
    name: "community feed route",
    path: "/community",
    screenshot: "route-community-feed.png",
    ready: (page) => page.getByRole("heading", { level: 1, name: "스타일 커뮤니티" })
  },
  {
    name: "community detail route",
    path: "/community/1",
    screenshot: "route-community-detail.png",
    ready: (page) => page.getByRole("heading", { level: 1, name: "봄 신상 후기" })
  },
  {
    name: "cart route",
    path: "/cart",
    screenshot: "route-cart-shell.png",
    mock: {
      startAuthenticated: true
    },
    ready: (page) => page.getByRole("heading", { level: 1, name: "장바구니" })
  },
  {
    name: "account route",
    path: "/account",
    screenshot: "route-account-shell.png",
    mock: {
      startAuthenticated: true
    },
    ready: (page) => page.getByRole("heading", { level: 1, name: "마이페이지" })
  },
  {
    name: "admin items route",
    path: "/admin/items",
    screenshot: "route-admin-items-shell.png",
    mock: {
      startAuthenticated: true,
      startAsAdmin: true
    },
    ready: (page) => page.getByRole("heading", { level: 1, name: "상품 관리" })
  },
  {
    name: "admin categories route",
    path: "/admin/categories",
    screenshot: "route-admin-categories-shell.png",
    mock: {
      startAuthenticated: true,
      startAsAdmin: true
    },
    ready: (page) => page.getByRole("heading", { level: 1, name: "카테고리 관리" })
  },
  {
    name: "not found route",
    path: "/missing-route",
    screenshot: "route-not-found-shell.png",
    ready: (page) =>
      page.getByRole("heading", { name: "찾으시는 페이지가 보이지 않습니다." })
  }
];

test.describe("visual regression baselines", () => {
  test("captures the home top shell across responsive breakpoints", async ({ page }) => {
    await openVisualHome(page);

    await expect(page).toHaveScreenshot("home-top-shell.png", {
      ...visualScreenshotOptions
    });
  });

  test("captures the merchandising section without layout drift", async ({ page }) => {
    await openVisualHome(page);

    const merchandisingGrid = page.locator(".merchandising-grid");
    await merchandisingGrid.scrollIntoViewIfNeeded();
    await blurActiveElement(page);

    await expect(merchandisingGrid).toHaveScreenshot("home-merchandising-grid.png", {
      ...visualScreenshotOptions
    });
  });

  for (const scenario of routeScenarios) {
    test(`captures ${scenario.name}`, async ({ page }) => {
      await openVisualRoute(page, scenario.path, {
        mock: scenario.mock,
        ready: scenario.ready(page)
      });

      await expect(page).toHaveScreenshot(scenario.screenshot, {
        ...visualScreenshotOptions
      });
    });
  }

  test("captures the mobile drawer opened above the storefront", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "visual-mobile",
      "모바일 프로젝트에서만 드로어 시각 회귀 기준을 저장합니다."
    );

    await openVisualHome(page);

    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await expect(page.locator(".header-panel")).toHaveClass(/header-panel-open/);
    await waitForVisualStability(page);
    await blurActiveElement(page);

    await expect(page).toHaveScreenshot("mobile-nav-drawer-open.png", {
      ...visualScreenshotOptions
    });
  });
});
