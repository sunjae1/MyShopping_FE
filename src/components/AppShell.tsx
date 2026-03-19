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
              <span>SELECT COMMERCE</span>
              <span>프로모션, 랭킹, 카탈로그를 한 화면에서 빠르게 탐색</span>
            </div>
            <div className="utility-session">
              {loading ? (
                <span>세션 확인 중</span>
              ) : user ? (
                <span>{user.name} 님, 회원 전용 장바구니를 사용할 수 있습니다.</span>
              ) : (
                <span>장바구니와 마이페이지는 로그인 후 이용할 수 있습니다.</span>
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
            {loading ? <span className="session-chip">세션 확인 중</span> : null}
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
          <p className="eyebrow">CSR STOREFRONT</p>
          <strong>Seoul Select Mall</strong>
        </div>
        <p>Spring Boot API와 JWT HttpOnly 쿠키 인증을 연결한 React 쇼핑몰 프런트입니다.</p>
      </footer>
    </div>
  );
}
