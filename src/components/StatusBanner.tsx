import type { PropsWithChildren } from "react";

interface StatusBannerProps extends PropsWithChildren {
  tone?: "info" | "success" | "error";
}

export function StatusBanner({
  tone = "info",
  children
}: StatusBannerProps) {
  if (!children) {
    return null;
  }

  return <div className={`status-banner status-${tone}`}>{children}</div>;
}
