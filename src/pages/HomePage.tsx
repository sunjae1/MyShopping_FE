import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCategories,
  fetchItems,
  fetchPosts,
  toAppErrorMessage
} from "../api/client";
import type { Category, Item, Post } from "../api/types";
import { ProductCard } from "../components/ProductCard";
import { StatusBanner } from "../components/StatusBanner";
import { formatCurrency, formatNumber } from "../lib/format";

const fallbackCollections = ["Minimal Edit", "Layered Wardrobe", "Weekend Softwear"];

export function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const catalogResultsRef = useRef<HTMLDivElement | null>(null);
  const pendingSearchTopRef = useRef<number | null>(null);
  const [catalogResultsMinHeight, setCatalogResultsMinHeight] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [nextItems, nextCategories, nextPosts] = await Promise.all([
          fetchItems(),
          fetchCategories().catch(() => []),
          fetchPosts().catch(() => [])
        ]);

        if (cancelled) {
          return;
        }

        setItems(nextItems);
        setCategories(nextCategories);
        setPosts(nextPosts);
      } catch (nextError) {
        if (!cancelled) {
          setError(toAppErrorMessage(nextError, "메인 화면을 불러오지 못했습니다."));
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

  const visibleItems = items.filter((item) =>
    item.itemName.toLowerCase().includes(query.trim().toLowerCase())
  );
  const heroItem = items[0] ?? null;
  const collectionNames =
    categories.length > 0 ? categories.map((category) => category.name) : fallbackCollections;

  useLayoutEffect(() => {
    if (pendingSearchTopRef.current === null) {
      return;
    }

    const searchInput = searchInputRef.current;

    if (!searchInput) {
      pendingSearchTopRef.current = null;
      return;
    }

    // Keep the search field anchored in the viewport while the result list shrinks.
    const nextTop = searchInput.getBoundingClientRect().top;
    const delta = nextTop - pendingSearchTopRef.current;

    if (delta !== 0) {
      window.scrollBy(0, delta);
    }

    pendingSearchTopRef.current = null;
  }, [query, visibleItems.length, loading]);

  function handleQueryChange(nextQuery: string) {
    const searchInput = searchInputRef.current;
    const catalogResults = catalogResultsRef.current;

    if (searchInput) {
      pendingSearchTopRef.current = searchInput.getBoundingClientRect().top;
    }

    if (!nextQuery.trim()) {
      setCatalogResultsMinHeight(null);
    } else if (catalogResults) {
      const currentHeight = catalogResults.getBoundingClientRect().height;
      setCatalogResultsMinHeight((previousHeight) =>
        Math.max(previousHeight ?? 0, currentHeight)
      );
    }

    setQuery(nextQuery);
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">SPRING CURATION 2026</p>
          <h1>감도 높은 셀렉션을 세션 기반 쇼핑 플로우로 다시 엮은 React 쇼핑몰</h1>
          <p className="hero-description">
            기존 Spring Boot 쇼핑몰 API를 바탕으로 홈, 상세, 장바구니, 주문,
            커뮤니티까지 한 흐름으로 이어지는 현대적 프런트 경험을 구성했습니다.
          </p>
          <div className="hero-actions">
            <a href="#catalog" className="primary-button link-button">
              컬렉션 보기
            </a>
            <Link to="/community" className="ghost-button link-button">
              커뮤니티 둘러보기
            </Link>
          </div>
          <dl className="hero-metrics">
            <div>
              <dt>Products</dt>
              <dd>{formatNumber(items.length)}</dd>
            </div>
            <div>
              <dt>Collections</dt>
              <dd>{formatNumber(collectionNames.length)}</dd>
            </div>
            <div>
              <dt>Stories</dt>
              <dd>{formatNumber(posts.length)}</dd>
            </div>
          </dl>
        </div>

        <div className="hero-card">
          {heroItem ? (
            <>
              <img src={heroItem.imageUrl || "/brand-mark.svg"} alt={heroItem.itemName} />
              <div className="hero-card-copy">
                <p className="eyebrow">FEATURED DROP</p>
                <h2>{heroItem.itemName}</h2>
                <p>{formatCurrency(heroItem.price)}</p>
                <span>남은 수량 {formatNumber(heroItem.quantity)}점</span>
              </div>
            </>
          ) : (
            <div className="hero-card-copy">
              <p className="eyebrow">API READY</p>
              <h2>백엔드 상품 데이터 연결 대기</h2>
              <p>상품이 아직 없다면 관리자 화면에서 상품을 먼저 등록해 주세요.</p>
            </div>
          )}
        </div>
      </section>

      <StatusBanner tone="error">{error}</StatusBanner>
      <section className="collections-strip">
        {collectionNames.map((name) => (
          <span key={name} className="collection-chip">
            {name}
          </span>
        ))}
      </section>

      <section className="story-grid">
        <article className="story-card story-card-accent">
          <p className="eyebrow">MERCHANDISING</p>
          <h2>카테고리 API는 연결했지만, 상품-카테고리 매핑은 아직 백엔드 DTO에 없습니다.</h2>
          <p>
            그래서 이 프런트는 카테고리를 무리하게 필터처럼 속이지 않고, 큐레이션
            스트립으로만 보여줍니다.
          </p>
        </article>
        <article className="story-card">
          <p className="eyebrow">SESSION FLOW</p>
          <h2>로그인은 `/api/login`, 로그아웃은 `/api/logout`으로 정리했습니다.</h2>
          <p>보호 API의 401은 로그인 페이지와 `returnTo` 흐름으로 이어집니다.</p>
        </article>
      </section>

      <section id="catalog" className="section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow">CATALOG</p>
            <h2>전체 상품</h2>
          </div>
          <label className="search-shell">
            <span>검색</span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="상품 이름으로 검색"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
            />
          </label>
        </div>

        <div
          ref={catalogResultsRef}
          className="catalog-results"
          style={
            catalogResultsMinHeight === null
              ? undefined
              : {
                  minHeight: `${catalogResultsMinHeight}px`
                }
          }
        >
          {loading ? <div className="surface-card">상품을 불러오는 중입니다.</div> : null}

          {!loading && visibleItems.length === 0 ? (
            <div className="surface-card">현재 검색 조건에 맞는 상품이 없습니다.</div>
          ) : null}

          <div className="product-grid">
            {visibleItems.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-block community-preview">
        <div className="section-header">
          <div>
            <p className="eyebrow">COMMUNITY</p>
            <h2>최근 게시물</h2>
          </div>
          <Link to="/community" className="ghost-button link-button">
            전체 보기
          </Link>
        </div>

        <div className="community-grid">
          {posts.slice(0, 3).map((post) => (
            <Link key={post.id} to={`/community/${post.id}`} className="community-card">
              <span className="eyebrow">FROM {post.author}</span>
              <h3>{post.title}</h3>
              <p>{post.content}</p>
            </Link>
          ))}

          {posts.length === 0 ? (
            <div className="surface-card">
              공개 게시물 API는 연결되어 있습니다. 첫 게시물을 작성해 보세요.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
