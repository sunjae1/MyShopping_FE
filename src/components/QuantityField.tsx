interface QuantityFieldProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function QuantityField({
  value,
  min = 1,
  max,
  onChange
}: QuantityFieldProps) {
  function clamp(nextValue: number) {
    if (typeof max === "number") {
      return Math.min(Math.max(nextValue, min), max);
    }

    return Math.max(nextValue, min);
  }

  return (
    <div className="quantity-field">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        aria-label="수량 감소"
      >
        -
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value) || min))}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        aria-label="수량 증가"
      >
        +
      </button>
    </div>
  );
}
