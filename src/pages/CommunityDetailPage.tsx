import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createComment,
  deleteComment,
  deletePost,
  fetchPost,
  isUnauthorizedError,
  toAppErrorMessage,
  updateComment,
  updatePost
} from "../api/client";
import type { Comment, Post } from "../api/types";
import { ConfirmModal } from "../components/ConfirmModal";
import { StatusBanner } from "../components/StatusBanner";
import { useSession } from "../contexts/SessionContext";
import { formatDateTime } from "../lib/format";
import {
  getLengthHintText,
  POST_CONTENT_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  validatePostDraftLength
} from "../lib/postValidation";

const DELETE_MODAL_PREVIEW_MAX_LENGTH = 48;

function getDeleteModalPreview(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  return normalized.length > DELETE_MODAL_PREVIEW_MAX_LENGTH
    ? `${normalized.slice(0, DELETE_MODAL_PREVIEW_MAX_LENGTH).trimEnd()}···`
    : normalized;
}

function renderDeleteModalDescription(text: string, warning: string) {
  const preview = getDeleteModalPreview(text);

  return (
    <>
      {preview ? <span className="modal-description-preview">"{preview}"</span> : null}
      <span className="modal-description-note">{warning}</span>
    </>
  );
}

export function CommunityDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingPost, setEditingPost] = useState(false);
  const [postDraft, setPostDraft] = useState({
    title: "",
    content: ""
  });
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [pendingDeletePost, setPendingDeletePost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [pendingDeleteComment, setPendingDeleteComment] = useState<Comment | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const editPostLengthErrors = validatePostDraftLength(postDraft);
  const isEditPostLengthInvalid = Boolean(
    editPostLengthErrors.title || editPostLengthErrors.content
  );

  useEffect(() => {
    const postId = Number(params.postId);

    if (!postId) {
      setPost(null);
      setLoading(false);
      setFeedback("잘못된 게시글 경로입니다.");
      return;
    }

    let cancelled = false;

    async function load() {
      if (!cancelled) {
        setLoading(true);
        setPost(null);
        setFeedback(null);
      }

      try {
        const nextPost = await fetchPost(postId);

        if (cancelled) {
          return;
        }

        setPost(nextPost);
        setFeedback(null);
        setPostDraft({
          title: nextPost.title,
          content: nextPost.content
        });
      } catch (error) {
        if (!cancelled) {
          setPost(null);
          setFeedback(toAppErrorMessage(error, "게시글을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.postId]);

  const postId = Number(params.postId);
  const canEditPost = Boolean(user && post && user.name === post.author);

  async function reloadPost() {
    setLoading(true);
    setFeedback(null);

    try {
      const nextPost = await fetchPost(postId);
      setPost(nextPost);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const nextComment = await createComment(postId, commentDraft);
      setPost((current) =>
        current
          ? {
              ...current,
              comments: [...current.comments, nextComment]
            }
          : current
      );
      setCommentDraft("");
      setFeedback("댓글을 등록했습니다.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error, "댓글 등록에 실패했습니다."));
    }
  }

  async function handleUpdatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextLengthErrors = validatePostDraftLength(postDraft);

    if (nextLengthErrors.title || nextLengthErrors.content) {
      setFeedback(nextLengthErrors.title ?? nextLengthErrors.content);
      return;
    }

    try {
      const nextPost = await updatePost(postId, postDraft);
      setPost(nextPost);
      setEditingPost(false);
      setFeedback("게시글을 수정했습니다.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error, "게시글 수정에 실패했습니다."));
    }
  }

  async function handleDeletePost() {
    setDeletingPost(true);

    try {
      await deletePost(postId);
      navigate("/community");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error, "게시글 삭제에 실패했습니다."));
    } finally {
      setDeletingPost(false);
    }
  }

  async function handleDeleteComment(commentId: number) {
    setDeletingCommentId(commentId);

    try {
      await deleteComment(postId, commentId);
      setPost((current) =>
        current
          ? {
              ...current,
              comments: current.comments.filter((comment) => comment.id !== commentId)
            }
          : current
      );
      setFeedback("댓글을 삭제했습니다.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error, "댓글 삭제에 실패했습니다."));
    } finally {
      setDeletingCommentId(null);
    }
  }

  async function handleUpdateComment(
    event: FormEvent<HTMLFormElement>,
    comment: Comment
  ) {
    event.preventDefault();

    try {
      const nextComment = await updateComment(
        postId,
        comment.id,
        editingCommentText
      );
      setPost((current) =>
        current
          ? {
              ...current,
              comments: current.comments.map((entry) =>
                entry.id === comment.id ? nextComment : entry
              )
            }
          : current
      );
      setEditingCommentId(null);
      setEditingCommentText("");
      setFeedback("댓글을 수정했습니다.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error, "댓글 수정에 실패했습니다."));
    }
  }

  async function handleRefresh() {
    try {
      await reloadPost();
    } catch (error) {
      setFeedback(toAppErrorMessage(error, "게시글 새로고침에 실패했습니다."));
    }
  }

  if (loading) {
    return <div className="surface-card">게시글을 불러오는 중입니다.</div>;
  }

  if (!post) {
    return (
      <div className="page-stack">
        <StatusBanner tone="error">{feedback ?? "게시글을 찾을 수 없습니다."}</StatusBanner>
        <button type="button" className="ghost-button" onClick={() => void handleRefresh()}>
          다시 불러오기
        </button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ConfirmModal
        open={pendingDeletePost !== null}
        title="게시글을 삭제할까요?"
        description={
          pendingDeletePost
            ? renderDeleteModalDescription(
                pendingDeletePost.title,
                "글을 삭제하면 되돌릴 수 없습니다."
              )
            : null
        }
        confirmLabel="게시글 삭제"
        tone="danger"
        busy={deletingPost}
        onCancel={() => {
          if (deletingPost) {
            return;
          }
          setPendingDeletePost(null);
        }}
        onConfirm={() => {
          if (!pendingDeletePost) {
            return;
          }

          void handleDeletePost().finally(() => {
            setPendingDeletePost(null);
          });
        }}
      />

      <ConfirmModal
        open={pendingDeleteComment !== null}
        title="댓글을 삭제할까요?"
        description={
          pendingDeleteComment
            ? renderDeleteModalDescription(
                pendingDeleteComment.content,
                "댓글을 삭제하면 되돌릴 수 없습니다."
              )
            : null
        }
        confirmLabel="댓글 삭제"
        tone="danger"
        busy={
          pendingDeleteComment !== null &&
          deletingCommentId === pendingDeleteComment.id
        }
        onCancel={() => {
          if (deletingCommentId !== null) {
            return;
          }
          setPendingDeleteComment(null);
        }}
        onConfirm={() => {
          if (!pendingDeleteComment) {
            return;
          }

          void handleDeleteComment(pendingDeleteComment.id).finally(() => {
            setPendingDeleteComment(null);
          });
        }}
      />

      <div className="community-detail-header">
        <p className="eyebrow community-detail-kicker">STORY</p>
        <div className="community-detail-title">
          <h1>{post.title}</h1>
        </div>
        <Link to="/community" className="ghost-button link-button community-detail-back-link">
          목록 보기
        </Link>
      </div>

      <StatusBanner tone="info">{feedback}</StatusBanner>

      <section className="surface-card post-detail-card">
        {editingPost ? (
          <form className="auth-form" onSubmit={handleUpdatePost}>
            <div className="auth-field">
              <label htmlFor="community-edit-title">제목</label>
              <input
                id="community-edit-title"
                type="text"
                required
                maxLength={POST_TITLE_MAX_LENGTH}
                aria-invalid={Boolean(editPostLengthErrors.title)}
                aria-describedby="community-edit-title-hint"
                value={postDraft.title}
                onChange={(event) =>
                  setPostDraft((current) => ({
                    ...current,
                    title: event.target.value
                  }))
                }
              />
              <p
                id="community-edit-title-hint"
                className={`field-hint${editPostLengthErrors.title ? " field-hint-error" : ""}`}
                aria-live="polite"
              >
                {getLengthHintText("제목", postDraft.title, POST_TITLE_MAX_LENGTH)}
              </p>
            </div>
            <div className="auth-field">
              <label htmlFor="community-edit-content">내용</label>
              <textarea
                id="community-edit-content"
                rows={8}
                required
                maxLength={POST_CONTENT_MAX_LENGTH}
                aria-invalid={Boolean(editPostLengthErrors.content)}
                aria-describedby="community-edit-content-hint"
                value={postDraft.content}
                onChange={(event) =>
                  setPostDraft((current) => ({
                    ...current,
                    content: event.target.value
                  }))
                }
              />
              <p
                id="community-edit-content-hint"
                className={`field-hint${editPostLengthErrors.content ? " field-hint-error" : ""}`}
                aria-live="polite"
              >
                {getLengthHintText("내용", postDraft.content, POST_CONTENT_MAX_LENGTH)}
              </p>
            </div>
            <div className="inline-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={isEditPostLengthInvalid}
              >
                저장
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setEditingPost(false)}
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="community-meta">
              <span>{post.author}</span>
              <span>{formatDateTime(post.createdDate)}</span>
            </div>
            <p className="post-body">{post.content}</p>
            {canEditPost ? (
              <div className="inline-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setEditingPost(true)}
                >
                  수정하기
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={deletingPost}
                  onClick={() => setPendingDeletePost(post)}
                >
                  {deletingPost ? "삭제 중..." : "삭제하기"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="surface-card comment-section-card">
        <div className="section-header comment-section-header">
          <div>
            <p className="eyebrow">COMMENTS</p>
            <h2>댓글</h2>
          </div>
        </div>

        <div className="comment-list">
          {post.comments.map((comment) => {
            const canEditComment = Boolean(user && user.name === comment.username);

            return (
              <article key={comment.id} className="comment-card detail-comment-card">
                <div className="community-meta">
                  <span>{comment.username}</span>
                  <span>{formatDateTime(comment.createdDate)}</span>
                </div>

                {editingCommentId === comment.id ? (
                  <form
                    className="auth-form"
                    onSubmit={(event) => void handleUpdateComment(event, comment)}
                  >
                    <textarea
                      rows={4}
                      required
                      value={editingCommentText}
                      onChange={(event) => setEditingCommentText(event.target.value)}
                    />
                    <div className="inline-actions">
                      <button type="submit" className="primary-button">
                        댓글 저장
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setEditingCommentId(null)}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p>{comment.content}</p>
                    {canEditComment ? (
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingCommentText(comment.content);
                          }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={deletingCommentId === comment.id}
                          onClick={() => setPendingDeleteComment(comment)}
                        >
                          {deletingCommentId === comment.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </article>
            );
          })}
        </div>

        {user ? (
          <form className="auth-form comment-compose-form" onSubmit={handleCreateComment}>
            <label>
              댓글 남기기
              <textarea
                rows={4}
                required
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
              />
            </label>
            <button type="submit" className="primary-button">
              댓글 남기기
            </button>
          </form>
        ) : (
          <p className="muted-copy">로그인 후 댓글을 남길 수 있습니다.</p>
        )}
      </section>
    </div>
  );
}
