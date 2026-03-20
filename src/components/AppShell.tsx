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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const syncViewport = (matches: boolean) => {
      setIsMobileViewport(matches);

      if (!matches) {
        setIsMobileMenuOpen(false);
      }
    };

    syncViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncViewport(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    document.body.classList.toggle(
      "mobile-nav-open",
      isMobileViewport && isMobileMenuOpen
    );

    return () => {
      document.body.classList.remove("mobile-nav-open");
    };
  }, [isMobileMenuOpen, isMobileViewport]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  async function handleLogout() {
    setLogoutError(null);
    closeMobileMenu();

    try {
      await logout();
      navigate("/");
    } catch (error) {
      setLogoutError(
        toAppErrorMessage(error, "로그아웃 중 문제가 발생했습니다.")
      );
    }
  }

  const navigationContent = (
    <>
      <nav className="site-nav" aria-label="주요 메뉴">
        <NavLink to="/" end className={linkClassName} onClick={closeMobileMenu}>
          홈
        </NavLink>
        <NavLink to="/community" className={linkClassName} onClick={closeMobileMenu}>
          커뮤니티
        </NavLink>
        {user?.role === "ADMIN" ? (
          <>
            <NavLink
              to="/admin/items"
              className={linkClassName}
              onClick={closeMobileMenu}
            >
              상품 관리
            </NavLink>
            <NavLink
              to="/admin/categories"
              className={linkClassName}
              onClick={closeMobileMenu}
            >
              카테고리 관리
            </NavLink>
          </>
        ) : null}
        <NavLink to="/account" className={linkClassName} onClick={closeMobileMenu}>
          마이페이지
        </NavLink>
        <NavLink to="/cart" className={linkClassName} onClick={closeMobileMenu}>
          장바구니
          {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
        </NavLink>
      </nav>

      <div className="header-actions">
        {loading ? <span className="session-chip">스토어 준비 중</span> : null}
        {user ? (
          <>
            <span className="session-chip">{user.name} 님</span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => void handleLogout()}
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="ghost-button link-button"
              onClick={closeMobileMenu}
            >
              로그인
            </Link>
            <Link
              to="/register"
              className="primary-button link-button"
              onClick={closeMobileMenu}
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </>
  );

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
          <Link to="/" className="brand-lockup" onClick={closeMobileMenu}>
            <img src="/brand-mark.svg" alt="Seoul Select Mall" />
            <div>
              <span className="brand-kicker">CURATED STOREFRONT</span>
              <strong>Seoul Select Mall</strong>
            </div>
          </Link>

          {isMobileViewport ? (
            <button
              type="button"
              className={`nav-toggle ${isMobileMenuOpen ? "nav-toggle-active" : ""}`}
              aria-controls="site-navigation-panel"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              onClick={() => setIsMobileMenuOpen((currentValue) => !currentValue)}
            >
              <span className="nav-toggle-line" />
              <span className="nav-toggle-line" />
              <span className="nav-toggle-line" />
            </button>
          ) : null}

          {!isMobileViewport ? (
            <div id="site-navigation-panel" className="header-panel">
              {navigationContent}
            </div>
          ) : null}
        </div>
      </header>

      {isMobileViewport ? (
        <>
          <div
            id="site-navigation-panel"
            className={`header-panel ${isMobileMenuOpen ? "header-panel-open" : ""}`}
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="header-panel-head">
              <div className="header-panel-copy">
                <span className="brand-kicker">모바일 메뉴</span>
                <strong>Seoul Select Navigation</strong>
              </div>
              <button
                type="button"
                className="header-panel-close"
                onClick={closeMobileMenu}
              >
                닫기
              </button>
            </div>

            {navigationContent}
          </div>

          <button
            type="button"
            className={`mobile-nav-overlay ${
              isMobileMenuOpen ? "mobile-nav-overlay-visible" : ""
            }`}
            aria-label="메뉴 배경 닫기"
            aria-hidden={!isMobileMenuOpen}
            tabIndex={isMobileMenuOpen ? 0 : -1}
            onClick={closeMobileMenu}
          >
            메뉴 배경 닫기
          </button>
        </>
      ) : null}

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
