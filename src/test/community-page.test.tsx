import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPost, fetchPosts } from "../api/client";
import type { Post } from "../api/types";
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
  const newestPost: Post = {
    id: 2,
    title: "최근 글",
    content: "최근 내용",
    author: "멤버",
    createdDate: "2026-03-21T10:00:00",
    comments: []
  };
  const oldestPost: Post = {
    id: 1,
    title: "예전 글",
    content: "예전 내용",
    author: "멤버",
    createdDate: "2026-03-20T10:00:00",
    comments: []
  };

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
    vi.mocked(fetchPosts).mockImplementation(async (sort = "desc") =>
      sort === "asc" ? [oldestPost, newestPost] : [newestPost, oldestPost]
    );
    vi.mocked(createPost).mockResolvedValue({
      id: 101,
      title: "새 게시글",
      content: "새 내용",
      author: "멤버",
      createdDate: "2026-03-21T12:00:00",
      comments: []
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads posts in descending order by default and refetches when the sort changes", async () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("link", { name: /최근 글/ })).toBeInTheDocument();
    expect(fetchPosts).toHaveBeenCalledWith("desc");

    fireEvent.change(screen.getByLabelText("게시글 정렬"), {
      target: { value: "asc" }
    });

    await waitFor(() => {
      expect(fetchPosts).toHaveBeenLastCalledWith("asc");
    });

    const postLinks = screen.getAllByRole("link");
    expect(postLinks[0]).toHaveTextContent("예전 글");
    expect(postLinks[1]).toHaveTextContent("최근 글");
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

  it("appends a newly created post when the page is sorted by oldest first", async () => {
    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("link", { name: /최근 글/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("게시글 정렬"), {
      target: { value: "asc" }
    });

    await waitFor(() => {
      expect(fetchPosts).toHaveBeenLastCalledWith("asc");
    });

    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "새 게시글" }
    });
    fireEvent.change(screen.getByLabelText("내용"), {
      target: { value: "새 내용" }
    });
    fireEvent.click(screen.getByRole("button", { name: "이야기 올리기" }));

    await waitFor(() => {
      const postLinks = screen.getAllByRole("link");
      expect(postLinks[2]).toHaveTextContent("새 게시글");
    });
  });
});
