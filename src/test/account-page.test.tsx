import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelOrder, fetchMyPage, updateProfile } from "../api/client";
import { AccountPage } from "../pages/AccountPage";

const useSessionMock = vi.fn();

vi.mock("../api/client", () => ({
  cancelOrder: vi.fn(),
  fetchMyPage: vi.fn(),
  isUnauthorizedError: vi.fn(() => false),
  toAppErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback),
  updateProfile: vi.fn()
}));

vi.mock("../contexts/SessionContext", () => ({
  useSession: () => useSessionMock()
}));

describe("AccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useSessionMock.mockReturnValue({
      user: {
        id: 1,
        email: "member@example.com",
        name: "멤버",
        role: "USER"
      },
      refreshSession: vi.fn()
    });

    vi.mocked(fetchMyPage).mockResolvedValue({
      user: {
        id: 1,
        email: "member@example.com",
        name: "멤버",
        role: "USER"
      },
      cartItems: [],
      posts: [],
      orders: [
        {
          id: 12,
          orderDate: "2026-03-20T10:00:00",
          status: "ORDER",
          orderItems: [
            {
              itemName: "Vintage Jacket",
              quantity: 2,
              price: 59000
            },
            {
              itemName: "Canvas Bag",
              quantity: 1,
              price: 29000
            }
          ]
        }
      ]
    });

    vi.mocked(cancelOrder).mockResolvedValue({
      id: 12,
      orderDate: "2026-03-20T10:00:00",
      status: "CANCELLED",
      orderItems: [
        {
          itemName: "Vintage Jacket",
          quantity: 2,
          price: 59000
        }
      ]
    });

    vi.mocked(updateProfile).mockResolvedValue({
      id: 1,
      email: "member@example.com",
      name: "멤버",
      role: "USER"
    });
  });

  it("opens a confirm modal before cancelling an order", async () => {
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("주문 #12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "주문 취소" }));

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("주문을 취소할까요?")).toBeInTheDocument();
    expect(within(dialog).getByText("주문 #12 · Vintage Jacket 2개 외 1건")).toBeInTheDocument();
    expect(
      within(dialog).getByText("주문을 취소하면 상태가 즉시 변경되며 되돌릴 수 없습니다.")
    ).toBeInTheDocument();
    expect(cancelOrder).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "주문 취소" }));

    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledWith(12);
    });
  });
});
