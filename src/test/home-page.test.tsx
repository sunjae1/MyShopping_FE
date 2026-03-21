import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    vi.useRealTimers();
    cleanup();
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-20T12:00:00"));

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
        itemCount: 1,
        representativeImageUrl: "/outer-category.webp"
      },
      {
        id: 2,
        name: "Knit",
        itemCount: 1,
        representativeImageUrl: "/knit-category.webp"
      }
    ]);
    vi.mocked(fetchPosts).mockResolvedValue([]);
  });

  it("keeps the daily-seeded featured hero stable while server-backed catalog search filters the grid", async () => {
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

  it("changes the featured hero when the seeded date changes", async () => {
    const rotatingItems = [
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
      },
      {
        id: 3,
        itemName: "Charlie Shirt",
        price: 99000,
        quantity: 9,
        categoryId: 3,
        categoryName: "Top",
        imageUrl: "/charlie.webp"
      }
    ];

    vi.mocked(fetchItems).mockImplementation(async () => rotatingItems);

    vi.setSystemTime(new Date("2026-03-20T12:00:00"));

    const firstRender = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "Bravo Knit" })
    ).toBeInTheDocument();

    firstRender.unmount();

    vi.setSystemTime(new Date("2026-03-21T12:00:00"));

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "Alpha Coat" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Bravo Knit" })
    ).not.toBeInTheDocument();
  });

  it("renders live category shortcut cards with representative images from API data", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "가격대 상위 상품" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Outer/ })).toBeInTheDocument();
    expect(screen.getByAltText("Outer 대표 이미지")).toHaveAttribute(
      "src",
      "/outer-category.webp"
    );
    expect(screen.getByAltText("Knit 대표 이미지")).toHaveAttribute(
      "src",
      "/knit-category.webp"
    );
    expect(screen.getAllByText("1개의 상품을 만나보세요")).toHaveLength(2);
    expect(screen.getByText("무드별로 골라보는 카테고리 라인업")).toBeInTheDocument();
  });

  it("keeps the style talk promo card compact with shortened author and date copy", async () => {
    vi.mocked(fetchPosts).mockResolvedValueOnce([
      {
        id: 11,
        title: "ERRORERRORERRORERRORERRORERRORERRORERRORERROR",
        content: "길게 작성된 본문",
        author: "테스터님의이름이조금길어도카드안에들어가야함",
        createdDate: "2026-03-21T05:28:00",
        comments: []
      }
    ]);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await screen.findByText("2026. 3. 21.");

    const styleTalkCard = screen.getByText("STYLE TALK").closest(".promo-card");

    expect(styleTalkCard).not.toBeNull();

    const promoCardQueries = within(styleTalkCard as HTMLElement);

    expect(
      promoCardQueries.getByRole("heading", {
        level: 3,
        name: "ERRORERRORERRORERRORERRORERRORERRORERRORERROR"
      })
    ).toBeInTheDocument();
    expect(
      promoCardQueries.getByText("테스터님의이름이조금길어도카드안에들어가야함")
    ).toBeInTheDocument();
    expect(promoCardQueries.getByText("2026. 3. 21.")).toBeInTheDocument();
    expect(screen.queryByText(/님의 새 글/)).not.toBeInTheDocument();
  });

  it("filters the catalog by category shortcut selection", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const shortcutButton = await screen.findByRole("button", { name: /Knit/ });
    fireEvent.click(shortcutButton);

    expect(await screen.findByText(/지금 보고 있는 카테고리:/)).toBeInTheDocument();
    expect(screen.getAllByText("Bravo Knit").length).toBeGreaterThan(0);
    expect(vi.mocked(fetchItems)).toHaveBeenLastCalledWith({
      keyword: "",
      categoryId: 2
    });
  });

  it("shows a placeholder copy when a category has no representative image", async () => {
    vi.mocked(fetchCategories).mockResolvedValueOnce([
      {
        id: 3,
        name: "Empty",
        itemCount: 0,
        representativeImageUrl: null
      }
    ]);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("button", { name: /Empty/ })).toBeInTheDocument();
    expect(screen.getByText("아직 해당 카테고리에 상품이 없습니다.")).toBeInTheDocument();
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
