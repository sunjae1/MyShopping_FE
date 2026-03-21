import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  cancelOrder,
  fetchMyPage,
  isUnauthorizedError,
  toAppErrorMessage,
  updateProfile
} from "../api/client";
import type { MyPage, Order } from "../api/types";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { StatusBanner } from "../components/StatusBanner";
import { useSession } from "../contexts/SessionContext";
import { formatCurrency, formatDateTime } from "../lib/format";

function getPostPreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "등록된 내용이 없습니다.";
  }

  return normalized.length > 96 ? `${normalized.slice(0, 96)}...` : normalized;
}

function getOrderPreview(order: Order) {
  const [firstItem] = order.orderItems;

  if (!firstItem) {
    return `주문 #${order.id}`;
  }

  const extraItemCount = order.orderItems.length - 1;
  const firstSummary = `${firstItem.itemName} ${firstItem.quantity}개`;

  return extraItemCount > 0 ? `${firstSummary} 외 ${extraItemCount}건` : firstSummary;
}

export function AccountPage() {
  const { user, refreshSession } = useSession();
  const [page, setPage] = useState<MyPage | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: ""
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [pendingCancelOrder, setPendingCancelOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) {
      setPage(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const nextPage = await fetchMyPage();

        if (cancelled) {
          return;
        }

        setPage(nextPage);
        setProfileForm({
          name: nextPage.user.name,
          email: nextPage.user.email
        });
      } catch (error) {
        if (!cancelled) {
          if (isUnauthorizedError(error)) {
            return;
          }

          setFeedback(toAppErrorMessage(error, "마이페이지를 불러오지 못했습니다."));
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
  }, [user?.id]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await updateProfile(profileForm);
      await refreshSession();
      const nextPage = await fetchMyPage();
      setPage(nextPage);
      setFeedback("회원 정보를 수정했습니다.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error, "회원 정보를 수정하지 못했습니다."));
    }
  }

  async function handleCancelOrder(orderId: number) {
    setCancellingOrderId(orderId);
    setFeedback(null);

    try {
      await cancelOrder(orderId);
      const nextPage = await fetchMyPage();
      setPage(nextPage);
      setFeedback(`주문 #${orderId}를 취소했습니다.`);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error, "주문 취소에 실패했습니다."));
    } finally {
      setCancellingOrderId(null);
    }
  }

  if (!user) {
    return (
      <div className="page-stack">
        <EmptyState
          eyebrow="PRIVATE AREA"
          title="마이페이지는 로그인 후 확인할 수 있습니다."
          description="로그인 후 주문 내역과 계정 정보를 편하게 확인해 보세요."
        />
        <div className="inline-actions">
          <Link to="/login" className="primary-button link-button">
            로그인
          </Link>
        </div>
      </div>
    );
  }

  const cartItems = page?.cartItems ?? [];
  const orders = page?.orders ?? [];
  const posts = page?.posts ?? [];

  return (
    <div className="page-stack">
      <ConfirmModal
        open={pendingCancelOrder !== null}
        title="주문을 취소할까요?"
        description={
          pendingCancelOrder ? (
            <>
              <span className="modal-description-preview">
                주문 #{pendingCancelOrder.id} · {getOrderPreview(pendingCancelOrder)}
              </span>
              <span className="modal-description-note">
                주문을 취소하면 상태가 즉시 변경되며 되돌릴 수 없습니다.
              </span>
            </>
          ) : (
            ""
          )
        }
        confirmLabel="주문 취소"
        tone="danger"
        busy={
          pendingCancelOrder !== null &&
          cancellingOrderId === pendingCancelOrder.id
        }
        onCancel={() => {
          if (cancellingOrderId !== null) {
            return;
          }

          setPendingCancelOrder(null);
        }}
        onConfirm={() => {
          if (!pendingCancelOrder) {
            return;
          }

          void handleCancelOrder(pendingCancelOrder.id).finally(() => {
            setPendingCancelOrder(null);
          });
        }}
      />

      <div className="section-header">
        <div>
          <p className="eyebrow">MY ATELIER</p>
          <h1>마이페이지</h1>
        </div>
      </div>

      <StatusBanner tone="info">{feedback}</StatusBanner>

      {loading && !page ? <div className="surface-card">내 정보를 불러오는 중입니다.</div> : null}

      <div className="account-grid">
        <section className="surface-card">
          <p className="eyebrow">PROFILE</p>
          <h2>회원 정보</h2>
          <form className="auth-form" onSubmit={handleProfileSubmit}>
            <label>
              이름
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />
            </label>
            <label>
              이메일
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
              />
            </label>
            <button type="submit" className="primary-button">
              정보 저장
            </button>
          </form>
        </section>

        <section className="surface-card">
          <p className="eyebrow">CART SNAPSHOT</p>
          <h2>장바구니 미리보기</h2>
          <ul className="stack-list">
            {cartItems.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.itemName}</strong>
                <span>{formatCurrency(entry.price)}</span>
              </li>
            ))}
          </ul>
          {cartItems.length === 0 ? (
            <p className="muted-copy">담아둔 상품이 아직 없습니다.</p>
          ) : null}
        </section>
      </div>

      <section className="surface-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">ORDERS</p>
            <h2>주문 내역</h2>
          </div>
        </div>
        <div className="order-list">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div>
                <strong>주문 #{order.id}</strong>
                <p>{formatDateTime(order.orderDate)}</p>
                <span className="order-status">{order.status}</span>
              </div>
              <ul className="stack-list">
                {order.orderItems.map((orderItem) => (
                  <li key={`${order.id}-${orderItem.itemName}`}>
                    <span>
                      {orderItem.itemName} x {orderItem.quantity}
                    </span>
                    <strong>{formatCurrency(orderItem.price * orderItem.quantity)}</strong>
                  </li>
                ))}
              </ul>
              {order.status !== "CANCELLED" ? (
                <button
                  type="button"
                  className="ghost-button"
                  disabled={cancellingOrderId === order.id}
                  onClick={() => setPendingCancelOrder(order)}
                >
                  {cancellingOrderId === order.id ? "주문 취소 중..." : "주문 취소"}
                </button>
              ) : null}
            </article>
          ))}
          {orders.length === 0 ? (
            <p className="muted-copy">아직 주문 내역이 없습니다.</p>
          ) : null}
        </div>
      </section>

      <section className="surface-card account-posts-section">
        <div className="section-header section-header-wide">
          <div>
            <p className="eyebrow">POSTS</p>
            <h2>내 게시물</h2>
            <p className="section-description">
              내가 남긴 이야기와 반응을 한눈에 확인하고 다시 둘러볼 수 있습니다.
            </p>
          </div>
          <div className="account-post-summary">
            <span className="account-post-badge">총 {posts.length}개</span>
            <p className="field-hint">
              {posts.length > 0
                ? "최근에 작성한 글부터 차례로 살펴볼 수 있습니다."
                : "아직 작성한 게시물이 없습니다."}
            </p>
          </div>
        </div>

        <div className="account-post-grid">
          {posts.map((post, index) => (
            <article key={post.id} className="account-post-card">
              <div className="account-post-meta">
                <span className="account-post-index">{`POST ${String(index + 1).padStart(2, "0")}`}</span>
                <time dateTime={post.createdDate}>{formatDateTime(post.createdDate)}</time>
              </div>
              <div className="account-post-copy">
                <Link to={`/community/${post.id}`} className="account-post-title">
                  {post.title}
                </Link>
                <p className="account-post-excerpt">{getPostPreview(post.content)}</p>
              </div>
              <div className="account-post-footer">
                <span className="account-post-badge">댓글 {post.comments.length}개</span>
                <Link to={`/community/${post.id}`} className="ghost-button link-button">
                  게시물 보기
                </Link>
              </div>
            </article>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="muted-copy">작성한 게시물이 없습니다.</p>
        ) : null}
      </section>
    </div>
  );
}
