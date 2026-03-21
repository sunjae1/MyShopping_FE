import type { ReactNode } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  busy = false,
  tone = "default",
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className={`modal-kicker modal-kicker-${tone}`}>DELETE CHECK</p>
        <h2 id="confirm-modal-title">{title}</h2>
        <div className="modal-description">{description}</div>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`primary-button ${tone === "danger" ? "primary-button-danger" : ""}`.trim()}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
