import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminCategoriesPage } from "../pages/AdminCategoriesPage";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory
} from "../api/client";

vi.mock("../api/client", () => ({
  fetchCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  toAppErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback)
}));

describe("AdminCategoriesPage", () => {
  const categories = [
    {
      id: 1,
      name: "Outer",
      itemCount: 2,
      representativeImageUrl: "/outer.webp"
    },
    {
      id: 2,
      name: "Empty",
      itemCount: 0,
      representativeImageUrl: null
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCategories).mockResolvedValue(categories);
    vi.mocked(createCategory).mockResolvedValue({
      id: 3,
      name: "Shoes",
      itemCount: 0,
      representativeImageUrl: null
    });
    vi.mocked(updateCategory).mockResolvedValue({
      id: 1,
      name: "Edited Outer",
      itemCount: 2,
      representativeImageUrl: "/outer.webp"
    });
    vi.mocked(deleteCategory).mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders categories and shows a placeholder for empty categories", async () => {
    render(<AdminCategoriesPage />);

    expect(await screen.findByText("Outer")).toBeInTheDocument();
    expect(screen.getByText("아직 해당 카테고리에 상품이 없습니다.")).toBeInTheDocument();
  });

  it("creates a category through the admin form", async () => {
    render(<AdminCategoriesPage />);

    expect(await screen.findByText("Outer")).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText("카테고리 이름")[0], {
      target: {
        value: "Shoes"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "카테고리 생성" }));

    expect(await screen.findByText("새 카테고리를 만들었습니다.")).toBeInTheDocument();
    expect(createCategory).toHaveBeenCalledWith({
      name: "Shoes"
    });
  });

  it("opens a custom delete modal before deleting a category", async () => {
    render(<AdminCategoriesPage />);

    expect(await screen.findByText("Outer")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("카테고리를 삭제할까요?")).toBeInTheDocument();
    expect(screen.getByText(/"Outer" 카테고리를 삭제하면/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "카테고리 삭제" }));

    expect(deleteCategory).toHaveBeenCalledWith(1);
  });
});
