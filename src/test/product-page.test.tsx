import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchItem, fetchItems } from "../api/client";
import { ProductPage } from "../pages/ProductPage";

vi.mock("../api/client", () => ({
  fetchItem: vi.fn(),
  fetchItems: vi.fn(),
  isUnauthorizedError: vi.fn(() => false),
  toAppErrorMessage: vi.fn((_error: unknown, fallback?: string) => fallback ?? "오류")
}));

vi.mock("../contexts/CartContext", () => ({
  useCart: () => ({
    addItem: vi.fn(),
    cart: {
      cartItems: [],
      allPrice: 0
    },
    loading: false,
    refreshCart: vi.fn(),
    removeItem: vi.fn(),
    checkout: vi.fn()
  })
}));

describe("ProductPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only other items from the same category in the related section", async () => {
    vi.mocked(fetchItem).mockResolvedValue({
      id: 101,
      itemName: "현재 아우터 상품",
      price: 189000,
      quantity: 6,
      categoryId: 8,
      categoryName: "아우터",
      imageUrl: "/current.webp"
    });

    vi.mocked(fetchItems).mockResolvedValue([
      {
        id: 101,
        itemName: "현재 아우터 상품",
        price: 189000,
        quantity: 6,
        categoryId: 8,
        categoryName: "아우터",
        imageUrl: "/current.webp"
      },
      {
        id: 102,
        itemName: "같은 카테고리 A",
        price: 149000,
        quantity: 5,
        categoryId: 8,
        categoryName: "아우터",
        imageUrl: "/outer-a.webp"
      },
      {
        id: 103,
        itemName: "같은 카테고리 B",
        price: 159000,
        quantity: 7,
        categoryId: 8,
        categoryName: "아우터",
        imageUrl: "/outer-b.webp"
      },
      {
        id: 104,
        itemName: "같은 카테고리 C",
        price: 169000,
        quantity: 4,
        categoryId: 8,
        categoryName: "아우터",
        imageUrl: "/outer-c.webp"
      },
      {
        id: 201,
        itemName: "다른 카테고리 상품",
        price: 69000,
        quantity: 8,
        categoryId: 6,
        categoryName: "상의",
        imageUrl: "/top.webp"
      }
    ]);

    render(
      <MemoryRouter initialEntries={["/products/101"]}>
        <Routes>
          <Route path="/products/:productId" element={<ProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "현재 아우터 상품" })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { level: 3, name: "같은 카테고리 A" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "같은 카테고리 B" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "같은 카테고리 C" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "현재 아우터 상품" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 3, name: "다른 카테고리 상품" })
    ).not.toBeInTheDocument();
  });
});
