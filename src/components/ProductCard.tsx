import { Link } from "react-router-dom";
import type { Item } from "../api/types";
import {
  formatCurrency,
  getItemAvailability,
  resolveImageUrl
} from "../lib/format";

interface ProductCardProps {
  item: Item;
}

export function ProductCard({ item }: ProductCardProps) {
  const state =
    item.quantity <= 0
      ? {
          label: "품절",
          tone: "soldout"
        }
      : item.quantity < 5
        ? {
            label: "수량 한정",
            tone: "limited"
          }
        : {
            label: "판매중",
            tone: "live"
          };

  return (
    <article className="product-card">
      <Link className="product-card-link" to={`/products/${item.id}`}>
        <div className="product-card-media">
          <img
            src={resolveImageUrl(item.imageUrl)}
            alt={item.itemName}
            loading="lazy"
          />
        </div>
        <div className="product-card-copy">
          <div className="product-card-topline">
            <span className={`product-state product-state-${state.tone}`}>{state.label}</span>
            <span className="product-card-id">ITEM #{item.id}</span>
          </div>
          <h3>{item.itemName}</h3>
          <p className="product-card-stock">{getItemAvailability(item.quantity)}</p>
          <p className="product-card-price">{formatCurrency(item.price)}</p>
        </div>
      </Link>
      <Link
        to={`/products/${item.id}`}
        className="secondary-button link-button product-card-cta"
      >
        {item.quantity > 0 ? "상품 보기" : "품절"}
      </Link>
    </article>
  );
}
