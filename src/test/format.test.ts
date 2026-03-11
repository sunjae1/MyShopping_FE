import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  getItemAvailability,
  resolveImageUrl
} from "../lib/format";

describe("format helpers", () => {
  it("formats won prices", () => {
    expect(formatCurrency(129000)).toContain("129,000");
  });

  it("derives stock text", () => {
    expect(getItemAvailability(0)).toBe("품절");
    expect(getItemAvailability(3)).toBe("잔여 3점");
    expect(getItemAvailability(12)).toBe("재고 12점");
  });

  it("falls back to the local brand mark when no image exists", () => {
    expect(resolveImageUrl("")).toBe("/brand-mark.svg");
  });
});
