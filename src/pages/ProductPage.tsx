import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchItem,
  fetchItems,
  isUnauthorizedError,
  toAppErrorMessage
} from "../api/client";
import type { Item } from "../api/types";
import { ProductCard } from "../components/ProductCard";
import { QuantityField } from "../components/QuantityField";
import { StatusBanner } from "../components/StatusBanner";
import { useCart } from "../contexts/CartContext";
import {
  formatCurrency,
  formatNumber,
  getItemAvailability,
  resolveImageUrl
} from "../lib/format";

export function ProductPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [item, setItem] = useState<Item | null>(null);
  const [relatedItems, setRelatedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const itemId = Number(params.productId);

    if (!itemId) {
      setFeedback("잘못된 상품 경로입니다.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setFeedback(null);

      try {
        const [nextItem, allItems] = await Promise.all([
          fetchItem(itemId),
          fetchItems()
        ]);

        if (cancelled) {
          return;
        }

        setItem(nextItem);
        setQuantity(nextItem.quantity > 0 ? 1 : 0);
        setRelatedItems(allItems.filter((entry) => entry.id !== itemId).slice(0, 3));
      } catch (error) {
        if (!cancelled) {
          setFeedback(toAppErrorMessage(error, "상품 정보를 불러오지 못했습니다."));
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
  }, [params.productId]);

  async function handleAddToCart() {
    if (!item) {
      return;
    }

    try {
      await addItem(item.id, quantity);
      setFeedback(`${item.itemName} ${quantity}개를 장바구니에 담았습니다.`);
      navigate("/cart");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return;
      }

      setFeedback(toAppErrorMessage(error));
    }
  }

  if (loading) {
    return <div className="surface-card">상품 정보를 불러오는 중입니다.</div>;
  }

  if (!item) {
    return (
      <div className="page-stack">
        <StatusBanner tone="error">{feedback ?? "상품을 찾을 수 없습니다."}</StatusBanner>
        <Link to="/" className="ghost-button link-button">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <StatusBanner tone="info">{feedback}</StatusBanner>

      <section className="product-detail-shell">
        <div className="product-detail-media">
          <img src={resolveImageUrl(item.imageUrl)} alt={item.itemName} />
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow">PRODUCT DETAIL</p>
          <h1>{item.itemName}</h1>
          <p className="detail-price">{formatCurrency(item.price)}</p>
          <p className="detail-stock">{getItemAvailability(item.quantity)}</p>
          <p className="detail-description">
            기존 SSR 템플릿의 상품 페이지를 React 경험으로 재해석했습니다. 실제
            데이터는 `GET /api/items/{item.id}`에서 가져옵니다.
          </p>

          <dl className="detail-stats">
            <div>
              <dt>상품 번호</dt>
              <dd>#{item.id}</dd>
            </div>
            <div>
              <dt>재고</dt>
              <dd>{formatNumber(item.quantity)}점</dd>
            </div>
          </dl>

          <div className="purchase-panel">
            <QuantityField
              value={quantity || 1}
              min={1}
              max={Math.max(item.quantity, 1)}
              onChange={setQuantity}
            />
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleAddToCart()}
              disabled={item.quantity <= 0}
            >
              장바구니에 담기
            </button>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow">YOU MAY ALSO LIKE</p>
            <h2>다른 상품 더 보기</h2>
          </div>
        </div>
        <div className="product-grid">
          {relatedItems.map((relatedItem) => (
            <ProductCard key={relatedItem.id} item={relatedItem} />
          ))}
        </div>
      </section>
    </div>
  );
}
