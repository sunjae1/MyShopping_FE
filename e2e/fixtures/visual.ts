import { expect, type Locator, type Page } from "@playwright/test";
import { installMockApi, type MockApiOptions } from "./mockApi";

const FROZEN_DATE_ISO = "2026-03-20T09:00:00+09:00";

export const visualScreenshotOptions = {
  animations: "disabled" as const,
  caret: "hide" as const,
  scale: "css" as const,
  maxDiffPixelRatio: 0.01
};

export async function freezeVisualClock(page: Page, fixedIso = FROZEN_DATE_ISO) {
  await page.addInitScript({
    content: `
      (() => {
        const fixedTime = new Date(${JSON.stringify(fixedIso)}).valueOf();
        const NativeDate = Date;

        class MockDate extends NativeDate {
          constructor(...args) {
            super(...(args.length === 0 ? [fixedTime] : args));
          }

          static now() {
            return fixedTime;
          }
        }

        MockDate.parse = NativeDate.parse;
        MockDate.UTC = NativeDate.UTC;
        Object.setPrototypeOf(MockDate, NativeDate);
        window.Date = MockDate;
      })();
    `
  });
}

export async function waitForVisualStability(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => {
    return document.fonts ? document.fonts.status === "loaded" : true;
  });
  await page.waitForFunction(() => {
    return Array.from(document.images).every((image) => image.complete);
  });
}

export async function blurActiveElement(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

export async function openVisualHome(page: Page, options: MockApiOptions = {}) {
  await freezeVisualClock(page);
  await page.emulateMedia({
    reducedMotion: "reduce"
  });
  await installMockApi(page, options);

  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "지금 가장 마음에 드는 셀렉션을 만나보세요"
    })
  ).toBeVisible();

  await waitForVisualStability(page);
  await blurActiveElement(page);
}

export interface OpenVisualRouteOptions {
  mock?: MockApiOptions;
  ready: Locator;
}

export async function openVisualRoute(
  page: Page,
  routePath: string,
  options: OpenVisualRouteOptions
) {
  await freezeVisualClock(page);
  await page.emulateMedia({
    reducedMotion: "reduce"
  });
  await installMockApi(page, options.mock);

  await page.goto(routePath);
  await expect(options.ready).toBeVisible();

  await waitForVisualStability(page);
  await blurActiveElement(page);
}
