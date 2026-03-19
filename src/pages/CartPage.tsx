import { useState } from "react";
import { Link } from "react-router-dom";
import { isUnauthorizedError, toAppErrorMessage } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { StatusBanner } from "../components/StatusBanner";
import { useCart } from "../contexts/CartContext";
import { useSession } from "../contexts/SessionContext";
import { formatCurrency, resolveImageUrl } from "../lib/format";

export function CartPage() {
  const { user } = useSession();
  const { cart, loading, removeItem, checkout } = useCart();
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleRemove(itemId: number) {
    try {
      await removeItem(itemId);
      setFeedback("상품을 장바구니에서 제거했습니다.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error));
    }
  }

  async function handleCheckout() {
    try {
      const order = await checkout();
      setFeedback(`주문이 완료되었습니다. 주문 번호 #${order.id}`);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error));
    }
  }

  if (!user) {
    return (
      <div className="page-stack">
        <EmptyState
          eyebrow="AUTH REQUIRED"
          title="장바구니는 로그인 후 사용할 수 있습니다."
          description="현재 백엔드는 JWT HttpOnly 쿠키 인증으로 장바구니와 주문을 보호합니다."
        />
        <div className="inline-actions">
          <Link to="/login" className="primary-button link-button">
            로그인
          </Link>
          <Link to="/" className="ghost-button link-button">
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">CART</p>
          <h1>장바구니</h1>
        </div>
      </div>

      <StatusBanner tone="info">{feedback}</StatusBanner>

      {loading ? <div className="surface-card">장바구니를 불러오는 중입니다.</div> : null}

      {cart.cartItems.length === 0 && !loading ? (
        <EmptyState
          eyebrow="EMPTY"
          title="장바구니가 비어 있습니다."
          description="홈 화면에서 상품을 담은 뒤 다시 주문 플로우를 진행해 주세요."
        />
      ) : null}

      <div className="cart-layout">
        <section className="surface-card cart-list">
          {cart.cartItems.map((cartItem) => (
            <article key={cartItem.item.id} className="cart-row">
              <img
                src={resolveImageUrl(cartItem.item.imageUrl)}
                alt={cartItem.item.itemName}
              />
              <div>
                <h2>{cartItem.item.itemName}</h2>
                <p>{formatCurrency(cartItem.item.price)}</p>
                <span>수량 {cartItem.quantity}</span>
              </div>
              <div className="cart-row-actions">
                <strong>
                  {formatCurrency(cartItem.item.price * cartItem.quantity)}
                </strong>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handleRemove(cartItem.item.id)}
                >
                  제거
                </button>
              </div>
            </article>
          ))}
        </section>

        <aside className="surface-card cart-summary">
          <p className="eyebrow">ORDER SUMMARY</p>
          <h2>{formatCurrency(cart.allPrice)}</h2>
          <p>주문하기는 `POST /api/orders`로 장바구니 전체를 주문으로 전환합니다.</p>
          <button type="button" className="primary-button" onClick={() => void handleCheckout()}>
            지금 주문하기
          </button>
        </aside>
      </div>
    </div>
  );
}
