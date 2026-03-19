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
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  getItemAvailability,
  resolveImageUrl
} from "../lib/format";

export function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [visibleItems, setVisibleItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
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
        setVisibleItems(nextItems);
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

  useEffect(() => {
    let cancelled = false;

    if (loading) {
      return () => undefined;
    }

    if (!query.trim() && selectedCategoryId === null) {
      setVisibleItems(items);
      setCatalogLoading(false);
      return () => undefined;
    }

    async function loadFilteredItems() {
      setCatalogLoading(true);
      setError(null);

      try {
        const nextItems = await fetchItems({
          keyword: query,
          categoryId: selectedCategoryId
        });

        if (cancelled) {
          return;
        }

        setVisibleItems(nextItems);
      } catch (nextError) {
        if (!cancelled) {
          setError(toAppErrorMessage(nextError, "상품 필터 결과를 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    void loadFilteredItems();

    return () => {
      cancelled = true;
    };
  }, [items, loading, query, selectedCategoryId]);

  const heroItem = items[0] ?? null;
  const shortcutCollections = categories.slice(0, 6);
  const availableItemsCount = items.filter((item) => item.quantity > 0).length;
  const premiumItems = [...items].sort((left, right) => right.price - left.price).slice(0, 3);
  const lowStockItems = [...items]
    .filter((item) => item.quantity > 0)
    .sort((left, right) => left.quantity - right.quantity)
    .slice(0, 3);
  const communityHighlights = posts.slice(0, 3);
  const promoCards = [
    {
      eyebrow: "구매 가능 상품",
      title: `${formatNumber(availableItemsCount)}개`,
      description: "품절이 아닌 상품만 집계한 현재 재고 기준"
    },
    {
      eyebrow: "카테고리 필터",
      title: `${formatNumber(categories.length)}개`,
      description: "실제 `/api/categories`와 `/api/items?categoryId=` 기준"
    },
    communityHighlights[0]
      ? {
          eyebrow: "커뮤니티 업데이트",
          title: communityHighlights[0].title,
          description: `${communityHighlights[0].author} · ${formatDateTime(
            communityHighlights[0].createdDate
          )}`
        }
      : {
          eyebrow: "커뮤니티 운영",
          title: "게시판 연결 대기",
          description: "공개 게시글이 생기면 메인에 바로 노출"
        }
  ];
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;

  useLayoutEffect(() => {
    if (pendingSearchTopRef.current === null) {
      return;
    }

    const searchInput = searchInputRef.current;

    if (!searchInput) {
      pendingSearchTopRef.current = null;
      return;
    }

    const nextTop = searchInput.getBoundingClientRect().top;
    const delta = nextTop - pendingSearchTopRef.current;

    if (delta !== 0) {
      window.scrollBy(0, delta);
    }

    pendingSearchTopRef.current = null;
  }, [catalogLoading, loading, query, selectedCategoryId, visibleItems.length]);

  function preserveCatalogViewport() {
    const searchInput = searchInputRef.current;
    const catalogResults = catalogResultsRef.current;

    if (searchInput) {
      pendingSearchTopRef.current = searchInput.getBoundingClientRect().top;
    }

    if (catalogResults) {
      const currentHeight = catalogResults.getBoundingClientRect().height;
      setCatalogResultsMinHeight((previousHeight) => Math.max(previousHeight ?? 0, currentHeight));
    }
  }

  function handleQueryChange(nextQuery: string) {
    if (!nextQuery.trim() && selectedCategoryId === null) {
      setCatalogResultsMinHeight(null);
    } else {
      preserveCatalogViewport();
    }

    setQuery(nextQuery);
  }

  function handleCategoryChange(nextCategoryId: number | null) {
    if (nextCategoryId === null && !query.trim()) {
      setCatalogResultsMinHeight(null);
    } else {
      preserveCatalogViewport();
    }

    setSelectedCategoryId(nextCategoryId);
  }

  function handleShortcutClick(categoryId: number) {
    handleCategoryChange(selectedCategoryId === categoryId ? null : categoryId);
    document.getElementById("catalog")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <div className="page-stack home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">SPRING STOREFRONT 2026</p>
          <h1>프로모션, 랭킹, 카탈로그가 한 화면에서 바로 보이는 쇼핑몰 메인</h1>
          <p className="hero-description">
            상품과 카테고리는 실제 `/api/items`, `/api/categories` 데이터로만 구성합니다.
            카테고리 섹션은 `CategoryDTO` 대표이미지를 받아서 구성하고, 카드를 누르면
            해당 카테고리 상품만 바로 필터링합니다.
          </p>
          <div className="hero-actions">
            <a href="#catalog" className="primary-button link-button">
              전체 상품 보기
            </a>
            <Link to="/community" className="ghost-button link-button">
              커뮤니티 보기
            </Link>
          </div>
          <dl className="hero-metrics">
            <div>
              <dt>전체 상품</dt>
              <dd>{formatNumber(items.length)}</dd>
            </div>
            <div>
              <dt>카테고리</dt>
              <dd>{formatNumber(categories.length)}</dd>
            </div>
            <div>
              <dt>게시글</dt>
              <dd>{formatNumber(posts.length)}</dd>
            </div>
          </dl>
        </div>

        <div className="hero-merch-stack">
          {heroItem ? (
            <article className="hero-feature-card">
              <div className="hero-feature-media">
                <img src={resolveImageUrl(heroItem.imageUrl)} alt={heroItem.itemName} />
              </div>
              <div className="hero-feature-copy">
                <p className="eyebrow">MAIN PROMOTION</p>
                <h2>{heroItem.itemName}</h2>
                <p className="hero-feature-price">{formatCurrency(heroItem.price)}</p>
                <p className="muted-copy">
                  메인 프로모션 슬롯은 첫 상품 데이터를 사용합니다. 재고와 상세 페이지 진입을
                  최우선 CTA로 배치했습니다.
                </p>
                <div className="hero-feature-meta">
                  <span>{getItemAvailability(heroItem.quantity)}</span>
                  <Link to={`/products/${heroItem.id}`} className="primary-button link-button">
                    상세 보기
                  </Link>
                </div>
              </div>
            </article>
          ) : (
            <article className="hero-feature-card hero-feature-card-empty">
              <div className="hero-feature-copy">
                <p className="eyebrow">API READY</p>
                <h2>상품 데이터 연결 대기</h2>
                <p className="muted-copy">
                  현재 메인 프로모션은 첫 상품 데이터를 사용합니다. 상품이 없다면 관리자
                  화면에서 먼저 등록해 주세요.
                </p>
              </div>
            </article>
          )}

          <div className="hero-promo-grid">
            {promoCards.map((card) => (
              <article key={`${card.eyebrow}-${card.title}`} className="promo-card">
                <p className="eyebrow">{card.eyebrow}</p>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <StatusBanner tone="error">{error}</StatusBanner>

      <section className="section-block">
        <div className="section-header section-header-wide">
          <div>
            <p className="eyebrow">CATEGORIES</p>
            <h2>카테고리</h2>
            <p className="section-description">
              카테고리 대표이미지를 누르면 백엔드 `categoryId` 조건으로 전체 상품을 다시
              조회합니다.
            </p>
          </div>
          <div className="catalog-toolbar">
            <div className="catalog-summary">탐색 가능한 카테고리 {formatNumber(categories.length)}개</div>
            <p className="field-hint">
              {selectedCategory
                ? `현재 선택된 카테고리: ${selectedCategory.name}`
                : "카드를 누르면 해당 카테고리 상품만 바로 모아봅니다."}
            </p>
          </div>
        </div>

        <div className="shortcut-strip">
          {shortcutCollections.map((category, index) => {
            const isActive = selectedCategoryId === category.id;

            return (
              <button
                key={category.id}
                type="button"
                className={`shortcut-card shortcut-card-media ${isActive ? "shortcut-card-active" : ""}`.trim()}
                onClick={() => handleShortcutClick(category.id)}
              >
                <div className="shortcut-card-visual">
                  {category.representativeImageUrl ? (
                    <img
                      src={resolveImageUrl(category.representativeImageUrl)}
                      alt={`${category.name} 대표 이미지`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="shortcut-card-empty-copy">
                      아직 해당 카테고리에 상품이 없습니다.
                    </div>
                  )}
                </div>
                <div className="shortcut-card-body">
                  <span className="shortcut-index">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{category.name}</strong>
                  <p>
                    {typeof category.itemCount === "number"
                      ? `${formatNumber(category.itemCount)}개 상품이 연결된 카테고리`
                      : "카테고리별 상품만 빠르게 모아보는 바로가기"}
                  </p>
                  <span className="shortcut-cta">{isActive ? "필터 해제" : "카테고리 보기"}</span>
                </div>
              </button>
            );
          })}
          {shortcutCollections.length === 0 ? (
            <div className="surface-card">
              카테고리 데이터가 아직 없습니다. `/api/categories` 연결 후 바로가기 카드가
              채워집니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="merchandising-grid">
        <article className="merch-story merch-story-primary">
          <p className="eyebrow">MERCHANDISING NOTE</p>
          <h2>카테고리 카드는 이제 실제 필터 바로가기 역할을 하도록 정리했습니다.</h2>
          <p className="muted-copy">
            가격/재고 랭킹은 계속 파생 섹션으로 유지하고, 상단의 01~06 블록은 실데이터
            기반 카테고리 바로가기 카드로 의미를 분명히 했습니다.
          </p>
          <div className="merch-story-list">
            <div>
              <strong>카테고리</strong>
              <span>카드를 누르면 해당 카테고리 상품만 `/api/items`로 다시 조회합니다.</span>
            </div>
            <div>
              <strong>랭킹</strong>
              <span>가격/재고 순으로 가공한 탐색 보조 블록입니다.</span>
            </div>
            <div>
              <strong>커뮤니티</strong>
              <span>최근 공개 게시글을 메인 트래픽 블록으로 재배치했습니다.</span>
            </div>
          </div>
        </article>

        <article className="merch-ranking-panel">
          <p className="eyebrow">PRICE FOCUS</p>
          <h2>가격대 상위 상품</h2>
          <ul className="merch-ranking-list">
            {premiumItems.map((item, index) => (
              <li key={item.id}>
                <Link to={`/products/${item.id}`} className="merch-ranking-item">
                  <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="ranking-copy">
                    <strong>{item.itemName}</strong>
                    <span className="ranking-meta">
                      {formatCurrency(item.price)} · {getItemAvailability(item.quantity)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
            {premiumItems.length === 0 ? (
              <li className="muted-copy">상품이 등록되면 가격대 상위 목록이 표시됩니다.</li>
            ) : null}
          </ul>
        </article>

        <article className="merch-ranking-panel">
          <p className="eyebrow">LOW STOCK</p>
          <h2>재고 임박 체크</h2>
          <ul className="merch-ranking-list">
            {lowStockItems.map((item, index) => (
              <li key={item.id}>
                <Link to={`/products/${item.id}`} className="merch-ranking-item">
                  <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="ranking-copy">
                    <strong>{item.itemName}</strong>
                    <span className="ranking-meta">
                      {formatNumber(item.quantity)}점 남음 · {formatCurrency(item.price)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
            {lowStockItems.length === 0 ? (
              <li className="muted-copy">재고가 있는 상품이 등록되면 이 영역이 채워집니다.</li>
            ) : null}
          </ul>
        </article>
      </section>

      <section id="catalog" className="section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow">CATALOG</p>
            <h2>전체 상품</h2>
          </div>
          <div className="catalog-summary">현재 {formatNumber(visibleItems.length)}개 상품 노출</div>
        </div>

        <div className="catalog-filter-panel">
          <div className="catalog-filter-row">
            <label className="search-shell">
              <span>카테고리</span>
              <select
                value={selectedCategoryId === null ? "all" : String(selectedCategoryId)}
                onChange={(event) =>
                  handleCategoryChange(
                    event.target.value === "all" ? null : Number(event.target.value)
                  )
                }
              >
                <option value="all">전체 카테고리</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="catalog-filter-search-group">
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
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setQuery("");
                  handleCategoryChange(null);
                }}
              >
                필터 초기화
              </button>
            </div>
          </div>
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
          {loading || catalogLoading ? (
            <div className="surface-card">상품을 불러오는 중입니다.</div>
          ) : null}

          {!loading && !catalogLoading && visibleItems.length === 0 ? (
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
            <p className="section-description">
              메인에서도 게시판 흐름이 이어지도록 최근 글을 카드형으로 배치했습니다.
            </p>
          </div>
          <Link to="/community" className="ghost-button link-button">
            전체 보기
          </Link>
        </div>

        <div className="community-preview-grid">
          {communityHighlights.map((post, index) => (
            <Link
              key={post.id}
              to={`/community/${post.id}`}
              className={`community-card ${index === 0 ? "community-card-featured" : ""}`.trim()}
            >
              <span className="eyebrow">FROM {post.author}</span>
              <h3>{post.title}</h3>
              <p>{post.content}</p>
              <span className="community-meta">{formatDateTime(post.createdDate)}</span>
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
