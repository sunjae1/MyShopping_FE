import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { createLoginPath } from "../lib/auth";
import { useSession } from "../contexts/SessionContext";

export function RequireAuth() {
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

  return <Outlet />;
}
