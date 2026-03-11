export interface AuthRequiredDetail {
  message?: string;
  reason?: "auth";
  returnTo?: string;
}

const AUTH_REQUIRED_EVENT = "shopping:auth-required";

export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export function getCurrentReturnTo(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function createLoginPath(
  returnTo?: string | null,
  reason?: AuthRequiredDetail["reason"]
): string {
  const params = new URLSearchParams();
  const safeReturnTo = sanitizeReturnTo(returnTo);

  if (safeReturnTo) {
    params.set("returnTo", safeReturnTo);
  }

  if (reason) {
    params.set("reason", reason);
  }

  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function getAuthMessage(reason: string | null | undefined): string | null {
  if (reason === "auth") {
    return "로그인이 필요합니다.";
  }

  return null;
}

export function dispatchAuthRequired(detail: AuthRequiredDetail = {}): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthRequiredDetail>(AUTH_REQUIRED_EVENT, {
      detail: {
        reason: "auth",
        returnTo: getCurrentReturnTo(),
        ...detail
      }
    })
  );
}

export function subscribeAuthRequired(
  listener: (detail: AuthRequiredDetail) => void
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    listener((event as CustomEvent<AuthRequiredDetail>).detail ?? {});
  };

  window.addEventListener(AUTH_REQUIRED_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(AUTH_REQUIRED_EVENT, handler as EventListener);
  };
}
