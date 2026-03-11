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
          <p className="product-card-id">DROP #{item.id}</p>
          <h3>{item.itemName}</h3>
          <p className="product-card-price">{formatCurrency(item.price)}</p>
          <p className="product-card-stock">{getItemAvailability(item.quantity)}</p>
        </div>
      </Link>
      <Link
        to={`/products/${item.id}`}
        className="secondary-button link-button"
      >
        {item.quantity > 0 ? "장바구니 담기" : "품절"}
      </Link>
    </article>
  );
}
