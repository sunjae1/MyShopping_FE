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

function getDailySeedValue(date: Date): number {
  const dateKey = [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");

  return dateKey.split("").reduce((total, digit, index) => {
    return total + Number(digit) * (index + 1);
  }, 0);
}

function getDailyHeroItem(items: Item[]): Item | null {
  if (items.length === 0) {
    return null;
  }

  const candidateItems = items.filter((entry) => entry.quantity > 0);
  const sourceItems = candidateItems.length > 0 ? candidateItems : items;
  const heroIndex = getDailySeedValue(new Date()) % sourceItems.length;

  return sourceItems[heroIndex] ?? sourceItems[0] ?? null;
}

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

  const heroItem = getDailyHeroItem(items);
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
      description: "지금 바로 만나볼 수 있는 이번 주 셀렉션"
    },
    {
      eyebrow: "카테고리",
      title: `${formatNumber(categories.length)}개`,
      description: "무드별로 골라보는 카테고리 라인업"
    },
    communityHighlights[0]
      ? {
          eyebrow: "STYLE TALK",
          title: communityHighlights[0].title,
          description: `${communityHighlights[0].author}님의 새 글 · ${formatDateTime(
            communityHighlights[0].createdDate
          )}`
        }
      : {
          eyebrow: "STYLE TALK",
          title: "새로운 이야기를 기다리는 중",
          description: "쇼핑 팁과 후기를 가장 먼저 나눠보세요."
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
          <div className="hero-copy-main">
            <p className="eyebrow">SPRING STOREFRONT 2026</p>
            <h1>지금 가장<br></br> 마음에 드는<br></br> 셀렉션을 만나보세요</h1>
            <p className="hero-description">
              매일 입기 좋은 기본 아이템부터 포인트 룩까지, 취향에 맞는 상품을 가볍게
              둘러보고 바로 쇼핑해 보세요.
            </p>
            <div className="hero-actions">
              <a href="#catalog" className="primary-button link-button">
                지금 쇼핑하기
              </a>
              <Link to="/community" className="ghost-button link-button">
                스타일 피드 보기
              </Link>
            </div>
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
                <p className="eyebrow">EDITOR'S PICK</p>
                <h2>{heroItem.itemName}</h2>
                <p className="hero-feature-price">{formatCurrency(heroItem.price)}</p>
                <p className="muted-copy">
                  이번 시즌 가장 먼저 소개하고 싶은 아이템입니다. 자세히 보고 마음에 들면
                  장바구니에 담아보세요.
                </p>
                <div className="hero-feature-meta">
                  <span>{getItemAvailability(heroItem.quantity)}</span>
                  <Link to={`/products/${heroItem.id}`} className="primary-button link-button">
                    자세히 보기
                  </Link>
                </div>
              </div>
            </article>
          ) : (
            <article className="hero-feature-card hero-feature-card-empty">
              <div className="hero-feature-copy">
                <p className="eyebrow">NEW ARRIVAL</p>
                <h2>새로운 셀렉션을 준비 중입니다</h2>
                <p className="muted-copy">
                  곧 소개할 상품이 도착하면 이 자리에 가장 먼저 보여드릴게요.
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
              취향에 맞는 카테고리를 눌러 원하는 상품만 빠르게 둘러보세요.
            </p>
          </div>
          <div className="catalog-toolbar">
            <div className="catalog-summary">둘러보기 좋은 카테고리 {formatNumber(categories.length)}개</div>
            <p className="field-hint">
              {selectedCategory
                ? `지금 보고 있는 카테고리: ${selectedCategory.name}`
                : "원하는 카테고리를 눌러 상품을 좁혀보세요."}
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
                      ? `${formatNumber(category.itemCount)}개의 상품을 만나보세요`
                      : "취향에 맞는 아이템을 빠르게 모아보세요"}
                  </p>
                  <span className="shortcut-cta">{isActive ? "전체 상품 보기" : "이 카테고리 보기"}</span>
                </div>
              </button>
            );
          })}
          {shortcutCollections.length === 0 ? (
            <div className="surface-card">
              준비 중인 카테고리입니다. 곧 새로운 상품으로 채워질 예정입니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="merchandising-grid">
        <article className="merch-story merch-story-primary">
          <p className="eyebrow">CURATION NOTE</p>
          <h2>오늘의 셀렉션을 한눈에 비교해 보세요.</h2>
          <p className="muted-copy">
            가격대가 높은 아이템, 재고가 빠르게 줄어드는 아이템, 최근 올라온 스타일
            이야기를 함께 살펴볼 수 있습니다.
          </p>
          <div className="merch-story-list">
            <div>
              <strong>카테고리</strong>
              <span>원하는 무드의 상품만 골라 편하게 둘러보세요.</span>
            </div>
            <div>
              <strong>가격대</strong>
              <span>예산과 취향에 맞는 포인트 아이템을 빠르게 확인할 수 있습니다.</span>
            </div>
            <div>
              <strong>스타일 피드</strong>
              <span>다른 고객들의 이야기와 감각적인 추천을 함께 만나보세요.</span>
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
              <li className="muted-copy">곧 추천 상품이 채워질 예정입니다.</li>
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
              <li className="muted-copy">인기 상품 소식이 곧 업데이트됩니다.</li>
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
          <div className="catalog-summary">총 {formatNumber(visibleItems.length)}개 상품</div>
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
            <div className="surface-card">상품을 준비하는 중입니다.</div>
          ) : null}

          {!loading && !catalogLoading && visibleItems.length === 0 ? (
            <div className="surface-card">
              선택한 조건에 맞는 상품이 없습니다. 다른 검색어나 카테고리로 다시 살펴보세요.
            </div>
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
            <h2>스타일 피드</h2>
            <p className="section-description">
              요즘 눈길이 가는 아이템과 쇼핑 이야기를 함께 나누는 공간입니다.
            </p>
          </div>
          <Link to="/community" className="ghost-button link-button">
            피드 전체 보기
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
              아직 등록된 이야기가 없습니다. 첫 스타일 후기를 남겨 보세요.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
