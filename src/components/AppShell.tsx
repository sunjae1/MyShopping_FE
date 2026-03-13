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
        <div className="header-inner">
          <Link to="/" className="brand-lockup">
            <img src="/brand-mark.svg" alt="Atelier Seoul" />
            <div>
              <span className="brand-kicker">CURATED STORE</span>
              <strong>Atelier Seoul</strong>
            </div>
          </Link>

          <nav className="site-nav">
            <NavLink to="/" end className={linkClassName}>
              Shop
            </NavLink>
            <NavLink to="/community" className={linkClassName}>
              Community
            </NavLink>
            <NavLink to="/account" className={linkClassName}>
              My Atelier
            </NavLink>
            <NavLink to="/cart" className={linkClassName}>
              Cart
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
          <p className="eyebrow">FRONTEND LAB</p>
          <strong>Atelier Seoul React Frontend</strong>
        </div>
        <p>
          Spring Boot API와 세션 기반 인증을 연결하는 독립형 React 쇼핑몰
          프런트입니다.
        </p>
      </footer>
    </div>
  );
}
