export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function getItemAvailability(quantity: number): string {
  if (quantity <= 0) {
    return "품절";
  }

  if (quantity < 5) {
    return `잔여 ${formatNumber(quantity)}점`;
  }

  return `재고 ${formatNumber(quantity)}점`;
}

export function resolveImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) {
    return "/brand-mark.svg";
  }

  return imageUrl;
}
