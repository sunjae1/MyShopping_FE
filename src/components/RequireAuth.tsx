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
    return <div className="surface-card">세션을 확인하는 중입니다.</div>;
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
        <h2>관리자 권한이 필요한 페이지입니다.</h2>
        <p className="muted-copy">
          현재 로그인한 계정은 이 관리 화면에 접근할 수 없습니다.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
