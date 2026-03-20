import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPost, fetchPosts } from "../api/client";
import { useSession } from "../contexts/SessionContext";
import { CommunityPage } from "../pages/CommunityPage";

vi.mock("../api/client", () => ({
  createPost: vi.fn(),
  fetchPosts: vi.fn(),
  isUnauthorizedError: vi.fn(() => false),
  toAppErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback)
}));

vi.mock("../contexts/SessionContext", () => ({
  useSession: vi.fn()
}));

describe("CommunityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSession).mockReturnValue({
      user: {
        id: 1,
        email: "member@example.com",
        name: "멤버",
        role: "USER"
      },
      featuredItems: [],
      loading: false,
      sessionError: null,
      refreshSession: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      clearSession: vi.fn()
    });
    vi.mocked(fetchPosts).mockResolvedValue([]);
    vi.mocked(createPost).mockResolvedValue({
      id: 101,
      title: "새 게시글",
      content: "새 내용",
      author: "멤버",
      createdDate: "2026-03-21T12:00:00",
      comments: []
    });
  });

  it("shows remaining counters and blocks submit when the post exceeds the limit", async () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "오늘의 이야기 남기기" })
    ).toBeInTheDocument();

    const titleInput = screen.getByLabelText("제목");
    const contentTextarea = screen.getByLabelText("내용");
    const submitButton = screen.getByRole("button", { name: "이야기 올리기" });

    expect(titleInput).toHaveAttribute("maxlength", "80");
    expect(contentTextarea).toHaveAttribute("maxlength", "2000");
    expect(screen.getByText("80자 남음")).toBeInTheDocument();
    expect(screen.getByText("2000자 남음")).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: "a".repeat(81) } });
    fireEvent.change(contentTextarea, { target: { value: "b".repeat(2001) } });

    expect(
      screen.getByText("제목은 80자 이하로 입력해 주세요. 1자 초과했습니다.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("내용은 2000자 이하로 입력해 주세요. 1자 초과했습니다.")
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.submit(submitButton.closest("form") as HTMLFormElement);

    expect(createPost).not.toHaveBeenCalled();
    expect(screen.getByText("제목은 80자 이하로 입력해 주세요.")).toBeInTheDocument();
  });
});
