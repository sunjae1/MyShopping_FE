import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  cancelOrder,
  fetchMyPage,
  isUnauthorizedError,
  toAppErrorMessage,
  updateProfile
} from "../api/client";
import type { MyPage } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { StatusBanner } from "../components/StatusBanner";
import { useSession } from "../contexts/SessionContext";
import { formatCurrency, formatDateTime } from "../lib/format";

export function AccountPage() {
  const { user, refreshSession } = useSession();
  const [page, setPage] = useState<MyPage | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: ""
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    }
  }

  if (!user) {
    return (
      <div className="page-stack">
        <EmptyState
          eyebrow="PRIVATE AREA"
          title="마이페이지는 로그인 후 확인할 수 있습니다."
          description="백엔드의 `/api/myPage`는 인증된 사용자에게만 열려 있습니다."
        />
        <div className="inline-actions">
          <Link to="/login" className="primary-button link-button">
            로그인
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">MY ATELIER</p>
          <h1>마이페이지</h1>
        </div>
      </div>

      <StatusBanner tone="info">{feedback}</StatusBanner>

      {loading && !page ? <div className="surface-card">마이페이지를 불러오는 중입니다.</div> : null}

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
          <h2>마이페이지 장바구니 상품</h2>
          <ul className="stack-list">
            {(page?.cartItems ?? []).map((entry) => (
              <li key={entry.id}>
                <strong>{entry.itemName}</strong>
                <span>{formatCurrency(entry.price)}</span>
              </li>
            ))}
          </ul>
          {(page?.cartItems ?? []).length === 0 ? (
            <p className="muted-copy">현재 마이페이지에 노출되는 장바구니 상품이 없습니다.</p>
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
          {(page?.orders ?? []).map((order) => (
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
                  onClick={() => void handleCancelOrder(order.id)}
                >
                  주문 취소
                </button>
              ) : null}
            </article>
          ))}
          {(page?.orders ?? []).length === 0 ? (
            <p className="muted-copy">아직 주문 내역이 없습니다.</p>
          ) : null}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">POSTS</p>
            <h2>내 게시물</h2>
          </div>
        </div>
        <ul className="stack-list">
          {(page?.posts ?? []).map((post) => (
            <li key={post.id}>
              <Link to={`/community/${post.id}`}>{post.title}</Link>
              <span>{formatDateTime(post.createdDate)}</span>
            </li>
          ))}
        </ul>
        {(page?.posts ?? []).length === 0 ? (
          <p className="muted-copy">작성한 게시물이 없습니다.</p>
        ) : null}
      </section>
    </div>
  );
}
