import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../components/AppShell";
import { CartProvider } from "../contexts/CartContext";
import { SessionProvider } from "../contexts/SessionContext";
import { fetchCart, fetchSession } from "../api/client";

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

function LocationEcho() {
  const location = useLocation();

  return <div>{`${location.pathname}${location.search}`}</div>;
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(max-width: 760px)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

describe("AppShell offline startup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined
    });
    vi.mocked(fetchCart).mockResolvedValue({
      cartItems: [],
      allPrice: 0
    });
  });

  it("keeps the shell visible and surfaces a backend connectivity message", async () => {
    vi.mocked(fetchSession).mockRejectedValue(new TypeError("Failed to fetch"));

    const view = render(
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
      await screen.findByText("스토어 연결이 잠시 불안정합니다. 잠시 후 다시 시도해 주세요.")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("스토어 준비 중")).not.toBeInTheDocument();
    });
    expect(screen.getByText("홈 콘텐츠")).toBeInTheDocument();
  });

  it("clears the user shell and redirects to login when auth is required", async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      user: {
        id: 1,
        email: "member@example.com",
        name: "멤버",
        role: "USER"
      },
      items: []
    });

    render(
      <MemoryRouter initialEntries={["/account?tab=security"]}>
        <SessionProvider>
          <CartProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/account" element={<div>계정 콘텐츠</div>} />
                <Route path="*" element={<LocationEcho />} />
              </Route>
            </Routes>
          </CartProvider>
        </SessionProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("멤버 님")).toBeInTheDocument();

    window.dispatchEvent(
      new CustomEvent("shopping:auth-required", {
        detail: {
          message: "로그인이 필요합니다.",
          reason: "auth",
          returnTo: "/account?tab=security"
        }
      })
    );

    expect(
      await screen.findByText("/login?returnTo=%2Faccount%3Ftab%3Dsecurity&reason=auth")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("멤버 님")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "로그인" })).toBeInTheDocument();
  });

  it("shows the product management navigation for admin users", async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      user: {
        id: 99,
        email: "admin@example.com",
        name: "관리자",
        role: "ADMIN"
      },
      items: []
    });

    const view = render(
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

    expect(await screen.findByText("관리자 님")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "상품 관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "카테고리 관리" })).toBeInTheDocument();
  });

  it("opens and closes the mobile hamburger menu", async () => {
    mockMatchMedia(true);
    vi.mocked(fetchSession).mockResolvedValue({
      user: null,
      items: []
    });

    const view = render(
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

    const scoped = within(view.container);
    const openButton = await scoped.findByRole("button", { name: "메뉴 열기" });
    expect(scoped.queryByRole("link", { name: "커뮤니티" })).not.toBeInTheDocument();

    fireEvent.click(openButton);

    expect(openButton).toHaveAttribute("aria-expanded", "true");
    expect(scoped.getByRole("link", { name: "커뮤니티" })).toBeInTheDocument();
    expect(scoped.getByRole("link", { name: "로그인" })).toBeInTheDocument();

    fireEvent.click(openButton);

    await waitFor(() => {
      expect(scoped.queryByRole("link", { name: "커뮤니티" })).not.toBeInTheDocument();
    });
  });
});
