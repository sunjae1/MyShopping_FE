import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartPage } from "../pages/CartPage";

vi.mock("../api/client", () => ({
  isUnauthorizedError: vi.fn(() => false),
  toAppErrorMessage: vi.fn((_error?: unknown, fallback?: string) => fallback ?? "오류")
}));

const useSessionMock = vi.fn();
const useCartMock = vi.fn();

vi.mock("../contexts/SessionContext", () => ({
  useSession: () => useSessionMock()
}));

vi.mock("../contexts/CartContext", () => ({
  useCart: () => useCartMock()
}));

describe("CartPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the order summary and calculation visible when the cart is empty", () => {
    useSessionMock.mockReturnValue({
      user: {
        id: 1,
        email: "member@example.com",
        name: "멤버",
        role: "USER"
      }
    });
    useCartMock.mockReturnValue({
      cart: {
        cartItems: [],
        allPrice: 0
      },
      loading: false,
      removeItem: vi.fn(),
      checkout: vi.fn()
    });

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    expect(screen.getByText("장바구니가 비어 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("ORDER SUMMARY")).toBeVisible();
    expect(screen.getByText("CALCULATION")).toBeVisible();
    expect(screen.getByText("선택 상품")).toBeVisible();
    expect(screen.getByText("0개")).toBeVisible();
    expect(screen.getByRole("button", { name: "지금 주문하기" })).toBeEnabled();
    expect(screen.queryByText("수량 1")).not.toBeInTheDocument();
  });
});
