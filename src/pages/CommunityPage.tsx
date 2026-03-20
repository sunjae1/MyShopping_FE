import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createPost,
  fetchPosts,
  isUnauthorizedError,
  toAppErrorMessage
} from "../api/client";
import type { Post } from "../api/types";
import { StatusBanner } from "../components/StatusBanner";
import { useSession } from "../contexts/SessionContext";
import { formatDate } from "../lib/format";

function useOverflowFlag<T extends HTMLElement>(value: string) {
  const ref = useRef<T | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updateOverflow = () => {
      const hasVerticalOverflow = element.scrollHeight - element.clientHeight > 1;
      const hasHorizontalOverflow = element.scrollWidth - element.clientWidth > 1;

      setIsOverflowing(hasVerticalOverflow || hasHorizontalOverflow);
    };

    updateOverflow();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateOverflow();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [value]);

  return {
    ref,
    isOverflowing
  };
}

function CommunityListTitleText({ text }: { text: string }) {
  const { ref, isOverflowing } = useOverflowFlag<HTMLElement>(text);

  return (
    <strong
      ref={ref}
      className={`community-list-title${isOverflowing ? " community-list-title-truncated" : ""}`}
    >
      {text}
    </strong>
  );
}

function CommunityListExcerptText({ text }: { text: string }) {
  const { ref, isOverflowing } = useOverflowFlag<HTMLParagraphElement>(text);

  return (
    <p
      ref={ref}
      className={`community-list-excerpt${isOverflowing ? " community-list-excerpt-truncated" : ""}`}
    >
      {text}
    </p>
  );
}

export function CommunityPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWriteHighlighted, setIsWriteHighlighted] = useState(false);
  const writePanelRef = useRef<HTMLElement | null>(null);
  const writeHighlightTimerRef = useRef<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: ""
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const nextPosts = await fetchPosts();

        if (!cancelled) {
          setPosts(nextPosts);
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback(toAppErrorMessage(error, "게시글 목록을 불러오지 못했습니다."));
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
  }, []);

  useEffect(() => {
    return () => {
      if (writeHighlightTimerRef.current !== null) {
        window.clearTimeout(writeHighlightTimerRef.current);
      }
    };
  }, []);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const post = await createPost(form);
      setPosts((current) => [post, ...current]);
      setForm({
        title: "",
        content: ""
      });
      setFeedback("새 게시글을 등록했습니다.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error, "게시글 등록에 실패했습니다."));
    }
  }

  function handleWriteCta() {
    if (!user) {
      navigate("/login");
      return;
    }

    setIsWriteHighlighted(true);
    if (writeHighlightTimerRef.current !== null) {
      window.clearTimeout(writeHighlightTimerRef.current);
    }
    writeHighlightTimerRef.current = window.setTimeout(() => {
      setIsWriteHighlighted(false);
      writeHighlightTimerRef.current = null;
    }, 1800);

    if (window.matchMedia("(max-width: 1080px)").matches) {
      writePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }
  }

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">COMMUNITY</p>
          <h1>스타일 커뮤니티</h1>
        </div>
        <button type="button" className="primary-button" onClick={handleWriteCta}>
          글쓰기
        </button>
      </div>

      <StatusBanner tone="info">{feedback}</StatusBanner>

      <div className="community-layout">
        <section className="surface-card">
          <p className="eyebrow">STORIES</p>
          <h2>모든 이야기</h2>
          {loading ? <p className="muted-copy">게시글을 불러오는 중입니다.</p> : null}
          <div className="community-list">
            {posts.map((post) => (
              <Link key={post.id} to={`/community/${post.id}`} className="community-list-item">
                <CommunityListTitleText text={post.title} />
                <div className="community-meta community-list-meta">
                  <span>{post.author}</span>
                  <span>{formatDate(post.createdDate)}</span>
                </div>
                <CommunityListExcerptText text={post.content} />
              </Link>
            ))}
          </div>
          {posts.length === 0 && !loading ? (
            <p className="muted-copy">아직 게시글이 없습니다.</p>
          ) : null}
        </section>

        <aside
          id="community-write"
          ref={writePanelRef}
          className={`surface-card ${isWriteHighlighted ? "community-write-highlighted" : ""}`.trim()}
        >
          <p className="eyebrow">WRITE</p>
          <h2>오늘의 이야기 남기기</h2>
          {user ? (
            <form className="auth-form" onSubmit={handleCreatePost}>
              <label>
                제목
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label>
                내용
                <textarea
                  required
                  rows={6}
                  value={form.content}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, content: event.target.value }))
                  }
                />
              </label>
              <button type="submit" className="primary-button">
                이야기 올리기
              </button>
            </form>
          ) : (
            <p className="muted-copy">
              로그인 후 스타일 팁이나 쇼핑 후기를 남길 수 있습니다. 목록은 누구나 볼 수
              있습니다.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
