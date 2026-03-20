import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityDetailPage } from "../pages/CommunityDetailPage";
import {
  createComment,
  deleteComment,
  deletePost,
  fetchPost,
  updateComment,
  updatePost
} from "../api/client";
import { useSession } from "../contexts/SessionContext";

vi.mock("../api/client", () => ({
  fetchPost: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  deletePost: vi.fn(),
  updateComment: vi.fn(),
  updatePost: vi.fn(),
  isUnauthorizedError: vi.fn(() => false),
  toAppErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback)
}));

vi.mock("../contexts/SessionContext", () => ({
  useSession: vi.fn()
}));

describe("CommunityDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSession).mockReturnValue({
      user: {
        id: 1,
        email: "writer@example.com",
        name: "작성자",
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

    vi.mocked(fetchPost).mockResolvedValue({
      id: 1,
      title: "테스트 게시글",
      content: "본문",
      author: "작성자",
      createdDate: "2026-03-20T10:00:00",
      comments: [
        {
          id: 11,
          content: "삭제 예정 댓글",
          username: "작성자",
          createdDate: "2026-03-20T10:01:00"
        }
      ]
    });

    vi.mocked(createComment).mockResolvedValue({
      id: 99,
      content: "새 댓글",
      username: "작성자",
      createdDate: "2026-03-20T10:03:00"
    });
    vi.mocked(updateComment).mockResolvedValue({
      id: 11,
      content: "수정 댓글",
      username: "작성자",
      createdDate: "2026-03-20T10:01:00"
    });
    vi.mocked(updatePost).mockResolvedValue({
      id: 1,
      title: "수정 제목",
      content: "수정 본문",
      author: "작성자",
      createdDate: "2026-03-20T10:00:00",
      comments: []
    });
    vi.mocked(deletePost).mockResolvedValue();
    vi.mocked(deleteComment).mockResolvedValue();
  });

  it("opens a warning modal before deleting a comment", async () => {
    render(
      <MemoryRouter initialEntries={["/community/1"]}>
        <Routes>
          <Route path="/community/:postId" element={<CommunityDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("삭제 예정 댓글")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("댓글을 삭제할까요?")).toBeInTheDocument();
    expect(screen.getByText(/"삭제 예정 댓글" 댓글을 삭제하면 되돌릴 수 없습니다\./)).toBeInTheDocument();
    expect(deleteComment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "댓글 삭제" }));

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith(1, 11);
    });
    expect(await screen.findByText("댓글을 삭제했습니다.")).toBeInTheDocument();
  });

  it("opens a warning modal before deleting a post", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/community/1"]}>
        <Routes>
          <Route path="/community/:postId" element={<CommunityDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("테스트 게시글")).toBeInTheDocument();
    const postDetailCard = container.querySelector(".post-detail-card");
    expect(postDetailCard).not.toBeNull();

    fireEvent.click(within(postDetailCard as HTMLElement).getByRole("button", { name: "삭제하기" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("게시글을 삭제할까요?")).toBeInTheDocument();
    expect(screen.getByText(/"테스트 게시글" 글을 삭제하면 되돌릴 수 없습니다\./)).toBeInTheDocument();
    expect(deletePost).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "게시글 삭제" }));

    await waitFor(() => {
      expect(deletePost).toHaveBeenCalledWith(1);
    });
  });
});
