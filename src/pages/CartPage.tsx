import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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
  const [cartSidebarHeight, setCartSidebarHeight] = useState(0);
  const hasCartItems = cart.cartItems.length > 0;
  const itemCount = cart.cartItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
  const cartSidebarRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const sidebar = cartSidebarRef.current;
    if (!sidebar) {
      setCartSidebarHeight(0);
      return;
    }

    const syncSidebarHeight = () => {
      setCartSidebarHeight(Math.ceil(sidebar.getBoundingClientRect().height));
    };

    syncSidebarHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncSidebarHeight();
    });

    observer.observe(sidebar);

    return () => {
      observer.disconnect();
    };
  }, [itemCount, cart.allPrice]);

  const cartLayoutStyle: CSSProperties | undefined =
    cartSidebarHeight > 0
      ? ({ "--cart-sidebar-height": `${cartSidebarHeight}px` } as CSSProperties)
      : undefined;

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
          description="로그인 후 담아둔 상품과 주문 내역을 편하게 이어서 확인해 보세요."
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

      {loading ? <div className="surface-card">장바구니를 준비하는 중입니다.</div> : null}

      <div className="cart-layout" style={cartLayoutStyle}>
        {hasCartItems ? (
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
        ) : !loading ? (
          <EmptyState
            eyebrow="EMPTY"
            title="장바구니가 비어 있습니다."
            description="마음에 드는 상품을 담아두고 언제든 다시 주문해 보세요."
          />
        ) : null}

        <div className="cart-sidebar" ref={cartSidebarRef}>
          <aside className="surface-card cart-calculation">
            <p className="eyebrow">CALCULATION</p>
            <dl className="cart-calculation-list">
              <div className="cart-calculation-row">
                <dt>선택 상품</dt>
                <dd>{itemCount}개</dd>
              </div>
              <div className="cart-calculation-row">
                <dt>상품 합계</dt>
                <dd>{formatCurrency(cart.allPrice)}</dd>
              </div>
              <div className="cart-calculation-row">
                <dt>배송비</dt>
                <dd>{formatCurrency(0)}</dd>
              </div>
              <div className="cart-calculation-row cart-calculation-total">
                <dt>총 결제</dt>
                <dd>{formatCurrency(cart.allPrice)}</dd>
              </div>
            </dl>
          </aside>

          <aside className="surface-card cart-summary">
            <p className="eyebrow">ORDER SUMMARY</p>
            <h2>{formatCurrency(cart.allPrice)}</h2>
            <p>선택한 상품을 한 번에 주문하고, 주문 내역은 마이페이지에서 확인할 수 있습니다.</p>
            <button type="button" className="primary-button" onClick={() => void handleCheckout()}>
              지금 주문하기
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
