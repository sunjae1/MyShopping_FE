import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    cleanup();
  });

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

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("댓글을 삭제할까요?")).toBeInTheDocument();
    expect(within(dialog).getByText('"삭제 예정 댓글"')).toBeInTheDocument();
    expect(
      within(dialog).getByText("댓글을 삭제하면 되돌릴 수 없습니다.")
    ).toBeInTheDocument();
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

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("게시글을 삭제할까요?")).toBeInTheDocument();
    expect(within(dialog).getByText('"테스트 게시글"')).toBeInTheDocument();
    expect(within(dialog).getByText("글을 삭제하면 되돌릴 수 없습니다.")).toBeInTheDocument();
    expect(deletePost).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "게시글 삭제" }));

    await waitFor(() => {
      expect(deletePost).toHaveBeenCalledWith(1);
    });
  });

  it("shows edit counters and blocks saving when the post exceeds the limit", async () => {
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

    fireEvent.click(within(postDetailCard as HTMLElement).getByRole("button", { name: "수정하기" }));

    const titleInput = screen.getByLabelText("제목");
    const contentTextarea = screen.getByLabelText("내용");
    const saveButton = screen.getByRole("button", { name: "저장" });

    expect(titleInput).toHaveAttribute("maxlength", "80");
    expect(contentTextarea).toHaveAttribute("maxlength", "2000");

    fireEvent.change(titleInput, { target: { value: "a".repeat(81) } });
    fireEvent.change(contentTextarea, { target: { value: "b".repeat(2001) } });

    expect(
      screen.getByText("제목은 80자 이하로 입력해 주세요. 1자 초과했습니다.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("내용은 2000자 이하로 입력해 주세요. 1자 초과했습니다.")
    ).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    fireEvent.submit(saveButton.closest("form") as HTMLFormElement);

    expect(updatePost).not.toHaveBeenCalled();
    expect(screen.getByText("제목은 80자 이하로 입력해 주세요.")).toBeInTheDocument();
  });

  it("caps comment content at 255 characters in compose and edit forms", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/community/1"]}>
        <Routes>
          <Route path="/community/:postId" element={<CommunityDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("삭제 예정 댓글")).toBeInTheDocument();

    const composeTextarea = screen.getByLabelText("댓글 남기기");
    const composeButton = screen.getByRole("button", { name: "댓글 남기기" });

    expect(composeTextarea).toHaveAttribute("maxlength", "255");
    expect(screen.getByText("255자 남음")).toBeInTheDocument();

    fireEvent.change(composeTextarea, {
      target: { value: "c".repeat(255) }
    });

    expect(composeTextarea).toHaveValue("c".repeat(255));
    expect(
      within(composeButton.closest("form") as HTMLFormElement).getByText("0자 남음")
    ).toBeInTheDocument();
    expect(composeButton).toBeEnabled();

    fireEvent.change(composeTextarea, {
      target: { value: "c".repeat(256) }
    });

    expect(composeTextarea).toHaveValue("c".repeat(255));
    expect(
      within(composeButton.closest("form") as HTMLFormElement).getByText("0자 남음")
    ).toBeInTheDocument();
    expect(composeButton).toBeEnabled();

    const commentCard = container.querySelector(".detail-comment-card");
    expect(commentCard).not.toBeNull();

    fireEvent.click(
      within(commentCard as HTMLElement).getByRole("button", { name: "수정" })
    );

    const editTextarea = screen.getByLabelText("댓글 수정");
    const saveCommentButton = screen.getByRole("button", { name: "댓글 저장" });

    expect(editTextarea).toHaveAttribute("maxlength", "255");

    fireEvent.change(editTextarea, {
      target: { value: "d".repeat(256) }
    });

    expect(editTextarea).toHaveValue("d".repeat(255));
    expect(within(commentCard as HTMLElement).getByText("0자 남음")).toBeInTheDocument();
    expect(saveCommentButton).toBeEnabled();
  });

  it("truncates long delete preview text inside the modal", async () => {
    const longCommentContent = "ERROR".repeat(20);

    vi.mocked(fetchPost).mockResolvedValueOnce({
      id: 1,
      title: "테스트 게시글",
      content: "본문",
      author: "작성자",
      createdDate: "2026-03-20T10:00:00",
      comments: [
        {
          id: 11,
          content: longCommentContent,
          username: "작성자",
          createdDate: "2026-03-20T10:01:00"
        }
      ]
    });

    render(
      <MemoryRouter initialEntries={["/community/1"]}>
        <Routes>
          <Route path="/community/:postId" element={<CommunityDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(longCommentContent)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByText(
        (content) => content.startsWith('"ERROR') && content.endsWith('···"')
      )
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("댓글을 삭제하면 되돌릴 수 없습니다.")
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText(`"${longCommentContent}"`)
    ).not.toBeInTheDocument();
  });
});
