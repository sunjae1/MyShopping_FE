import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toAppErrorMessage } from "../api/client";
import { useCart } from "../contexts/CartContext";
import { useSession } from "../contexts/SessionContext";
import { createLoginPath, subscribeAuthRequired } from "../lib/auth";
import { StatusBanner } from "./StatusBanner";

function linkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? "nav-link nav-link-active" : "nav-link";
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useCart();
  const { user, loading, logout, clearSession, sessionError } = useSession();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const cartCount = cart.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    return subscribeAuthRequired((detail) => {
      clearSession();

      if (location.pathname === "/login") {
        return;
      }

      navigate(createLoginPath(detail.returnTo ?? currentPath, "auth"), {
        replace: true,
        state: {
          authMessage: detail.message ?? "로그인이 필요합니다."
        }
      });
    });
  }, [clearSession, currentPath, location.pathname, navigate]);

  async function handleLogout() {
    setLogoutError(null);

    try {
      await logout();
      navigate("/");
    } catch (error) {
      setLogoutError(
        toAppErrorMessage(error, "로그아웃 중 문제가 발생했습니다.")
      );
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-utility-bar">
          <div className="utility-inner">
            <div className="utility-copy">
              <span>SEOUL SELECT CURATION</span>
              <span>새로운 시즌 아이템과 감도 높은 셀렉션을 한눈에 만나보세요.</span>
            </div>
            <div className="utility-session">
              {loading ? (
                <span>스토어 준비 중</span>
              ) : user ? (
                <span>{user.name} 님, 저장한 상품과 주문 내역을 편하게 이어서 보세요.</span>
              ) : (
                <span>로그인하면 장바구니와 마이페이지를 더 편하게 이용할 수 있습니다.</span>
              )}
            </div>
          </div>
        </div>

        <div className="header-inner header-main">
          <Link to="/" className="brand-lockup">
            <img src="/brand-mark.svg" alt="Seoul Select Mall" />
            <div>
              <span className="brand-kicker">CURATED STOREFRONT</span>
              <strong>Seoul Select Mall</strong>
            </div>
          </Link>

          <nav className="site-nav">
            <NavLink to="/" end className={linkClassName}>
              홈
            </NavLink>
            <NavLink to="/community" className={linkClassName}>
              커뮤니티
            </NavLink>
            {user?.role === "ADMIN" ? (
              <>
                <NavLink to="/admin/items" className={linkClassName}>
                  상품 관리
                </NavLink>
                <NavLink to="/admin/categories" className={linkClassName}>
                  카테고리 관리
                </NavLink>
              </>
            ) : null}
            <NavLink to="/account" className={linkClassName}>
              마이페이지
            </NavLink>
            <NavLink to="/cart" className={linkClassName}>
              장바구니
              {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
            </NavLink>
          </nav>

          <div className="header-actions">
            {loading ? <span className="session-chip">스토어 준비 중</span> : null}
            {user ? (
              <>
                <span className="session-chip">{user.name} 님</span>
                <button type="button" className="ghost-button" onClick={() => void handleLogout()}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="ghost-button link-button">
                  로그인
                </Link>
                <Link to="/register" className="primary-button link-button">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="page-frame">
        <StatusBanner tone="error">{sessionError}</StatusBanner>
        <StatusBanner tone="error">{logoutError}</StatusBanner>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div>
          <p className="eyebrow">SEOUL SELECT</p>
          <strong>Seoul Select Mall</strong>
        </div>
        <p>감도 있는 데일리 셀렉션과 스타일 이야기를 함께 만나는 공간입니다.</p>
      </footer>
    </div>
  );
}
