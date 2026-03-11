import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProductCard } from "../components/ProductCard";

describe("ProductCard", () => {
  it("renders price and routes both card and CTA to the detail page", () => {
    render(
      <MemoryRouter>
        <ProductCard
          item={{
            id: 7,
            itemName: "Essential Coat",
            price: 179000,
            quantity: 4,
            imageUrl: "/image/1.webp"
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Essential Coat")).toBeInTheDocument();
    expect(screen.getByText(/179,000/)).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: /essential coat|장바구니 담기/i });
    expect(links).toHaveLength(2);

    for (const link of links) {
      expect(link).toHaveAttribute("href", "/products/7");
    }
  });
});
