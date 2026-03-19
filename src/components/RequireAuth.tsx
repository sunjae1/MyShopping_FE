import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { createLoginPath } from "../lib/auth";
import { useSession } from "../contexts/SessionContext";
import type { UserRole } from "../api/types";

interface RequireAuthProps {
  allowedRoles?: UserRole[];
}

export function RequireAuth({ allowedRoles }: RequireAuthProps) {
  const location = useLocation();
  const { user, loading, refreshSession } = useSession();
  const [verifying, setVerifying] = useState(false);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setVerifying(false);
      return () => undefined;
    }

    setVerifying(true);

    void refreshSession({ silent: true })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setVerifying(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshSession, user?.id, location.pathname, location.search, location.hash]);

  if (loading || verifying) {
    return <div className="surface-card">페이지를 준비하는 중입니다.</div>;
  }

  if (!user) {
    return (
      <Navigate
        to={createLoginPath(returnTo, "auth")}
        replace
        state={{ authMessage: "로그인이 필요합니다." }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="surface-card">
        <p className="eyebrow">ACCESS DENIED</p>
        <h2>운영자 전용 페이지입니다.</h2>
        <p className="muted-copy">
          현재 계정으로는 이 화면을 볼 수 없습니다. 다른 계정으로 다시 로그인해 주세요.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
