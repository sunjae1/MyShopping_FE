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

describe("HomePage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(fetchItems).mockResolvedValue([
      {
        id: 1,
        itemName: "Alpha Coat",
        price: 189000,
        quantity: 6,
        imageUrl: "/alpha.webp"
      },
      {
        id: 2,
        itemName: "Bravo Knit",
        price: 129000,
        quantity: 3,
        imageUrl: "/bravo.webp"
      }
    ]);
    vi.mocked(fetchCategories).mockResolvedValue([
      {
        id: 1,
        name: "Outer"
      }
    ]);
    vi.mocked(fetchPosts).mockResolvedValue([]);
  });

  it("keeps the featured hero stable while catalog search filters the grid", async () => {
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
