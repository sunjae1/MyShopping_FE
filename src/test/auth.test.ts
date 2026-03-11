import { describe, expect, it } from "vitest";
import { createLoginPath, sanitizeReturnTo } from "../lib/auth";

describe("auth helpers", () => {
  it("creates a login path with returnTo and reason", () => {
    expect(createLoginPath("/cart", "auth")).toBe("/login?returnTo=%2Fcart&reason=auth");
  });

  it("rejects unsafe returnTo values", () => {
    expect(sanitizeReturnTo("https://example.com")).toBeNull();
    expect(sanitizeReturnTo("//evil.test")).toBeNull();
    expect(sanitizeReturnTo("/account")).toBe("/account");
  });
});
