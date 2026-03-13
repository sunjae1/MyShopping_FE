import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "../components/AppShell";
import { CartProvider } from "../contexts/CartContext";
import { SessionProvider } from "../contexts/SessionContext";
import { fetchSession } from "../api/client";

vi.mock("../api/client", () => ({
  fetchSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  fetchCart: vi.fn(),
  addToCart: vi.fn(),
  removeCartItem: vi.fn(),
  checkout: vi.fn(),
  toAppErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback)
}));

describe("AppShell offline startup", () => {
  it("keeps the shell visible and surfaces a backend connectivity message", async () => {
    vi.mocked(fetchSession).mockRejectedValue(new TypeError("Failed to fetch"));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <SessionProvider>
          <CartProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<div>홈 콘텐츠</div>} />
              </Route>
            </Routes>
          </CartProvider>
        </SessionProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("홈 콘텐츠")).toBeInTheDocument();

    expect(
      await screen.findByText("백엔드 서버에 연결하지 못했습니다. 서버 실행 상태를 확인해 주세요.")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("세션 확인 중")).not.toBeInTheDocument();
    });
    expect(screen.getByText("홈 콘텐츠")).toBeInTheDocument();
  });
});
