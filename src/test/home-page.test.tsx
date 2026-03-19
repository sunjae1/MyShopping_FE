import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCategories, fetchItems, fetchPosts } from "../api/client";
import { HomePage } from "../pages/HomePage";

vi.mock("../api/client", () => ({
  fetchItems: vi.fn(),
  fetchCategories: vi.fn(),
  fetchPosts: vi.fn(),
  toAppErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback)
}));

const catalogItems = [
  {
    id: 1,
    itemName: "Alpha Coat",
    price: 189000,
    quantity: 6,
    categoryId: 1,
    categoryName: "Outer",
    imageUrl: "/alpha.webp"
  },
  {
    id: 2,
    itemName: "Bravo Knit",
    price: 129000,
    quantity: 3,
    categoryId: 2,
    categoryName: "Knit",
    imageUrl: "/bravo.webp"
  }
];

describe("HomePage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: vi.fn(),
      writable: true,
      configurable: true
    });

    vi.mocked(fetchItems).mockImplementation(async (filters) => {
      const keyword = filters?.keyword?.trim().toLowerCase() ?? "";
      const categoryId = filters?.categoryId ?? null;

      return catalogItems.filter((item) => {
        const matchesKeyword = !keyword || item.itemName.toLowerCase().includes(keyword);
        const matchesCategory = categoryId === null || item.categoryId === categoryId;

        return matchesKeyword && matchesCategory;
      });
    });
    vi.mocked(fetchCategories).mockResolvedValue([
      {
        id: 1,
        name: "Outer",
        itemCount: 1
      },
      {
        id: 2,
        name: "Knit",
        itemCount: 1
      }
    ]);
    vi.mocked(fetchPosts).mockResolvedValue([]);
  });

  it("keeps the featured hero stable while server-backed catalog search filters the grid", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "Alpha Coat" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("상품 이름으로 검색"), {
      target: {
        value: "Bravo"
      }
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Alpha Coat" })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 3, name: "Bravo Knit" })
    ).toBeInTheDocument();
    expect(vi.mocked(fetchItems)).toHaveBeenLastCalledWith({
      keyword: "Bravo",
      categoryId: null
    });
  });

  it("renders live category shortcut cards from API data", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "가격대 상위 상품" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Outer/ })).toBeInTheDocument();
    expect(screen.getAllByText("1개 상품이 연결된 카테고리")).toHaveLength(2);
    expect(screen.getByText("카테고리 필터")).toBeInTheDocument();
  });

  it("filters the catalog by category shortcut selection", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const shortcutButton = await screen.findByRole("button", { name: /Knit/ });
    fireEvent.click(shortcutButton);

    expect(await screen.findByText(/현재 선택된 카테고리:/)).toBeInTheDocument();
    expect(screen.getAllByText("Bravo Knit").length).toBeGreaterThan(0);
    expect(vi.mocked(fetchItems)).toHaveBeenLastCalledWith({
      keyword: "",
      categoryId: 2
    });
  });

  it("anchors the search field and preserves catalog height while filtering", async () => {
    const scrollBy = vi.fn();

    Object.defineProperty(window, "scrollBy", {
      value: scrollBy,
      writable: true
    });

    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const searchInput = await screen.findByPlaceholderText("상품 이름으로 검색");
    const catalogResults = container.querySelector(".catalog-results");

    expect(catalogResults).not.toBeNull();

    Object.defineProperty(searchInput, "getBoundingClientRect", {
      value: vi
        .fn()
        .mockImplementationOnce(() => ({
          x: 0,
          y: 640,
          width: 320,
          height: 48,
          top: 640,
          right: 320,
          bottom: 688,
          left: 0,
          toJSON: () => ({})
        }))
        .mockImplementation(() => ({
          x: 0,
          y: 420,
          width: 320,
          height: 48,
          top: 420,
          right: 320,
          bottom: 468,
          left: 0,
          toJSON: () => ({})
        })),
      configurable: true
    });

    Object.defineProperty(catalogResults!, "getBoundingClientRect", {
      value: vi.fn(() => ({
        x: 0,
        y: 0,
        width: 960,
        height: 720,
        top: 0,
        right: 960,
        bottom: 720,
        left: 0,
        toJSON: () => ({})
      })),
      configurable: true
    });

    fireEvent.change(searchInput, {
      target: {
        value: "Bravo"
      }
    });

    await waitFor(() => {
      expect(scrollBy).toHaveBeenCalledWith(0, -220);
    });
    expect(catalogResults).toHaveStyle({
      minHeight: "720px"
    });
  });
});
