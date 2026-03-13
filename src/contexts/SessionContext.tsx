import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from "react";
import {
  fetchSession,
  login as apiLogin,
  logout as apiLogout,
  toAppErrorMessage
} from "../api/client";
import type { Item, User } from "../api/types";

interface SessionContextValue {
  user: User | null;
  featuredItems: Item[];
  loading: boolean;
  sessionError: string | null;
  refreshSession: (options?: { silent?: boolean }) => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function toSessionErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "백엔드 서버에 연결하지 못했습니다. 서버 실행 상태를 확인해 주세요.";
  }

  return toAppErrorMessage(
    error,
    "세션을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
  );
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [featuredItems, setFeaturedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setFeaturedItems([]);
    setSessionError(null);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    setSessionError(null);

    try {
      const session = await fetchSession();
      setUser(session.user);
      setFeaturedItems(session.items);
    } catch (error) {
      setUser(null);
      setFeaturedItems([]);
      setSessionError(toSessionErrorMessage(error));
      throw error;
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const nextUser = await apiLogin(email, password);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    void refreshSession().catch(() => undefined);
  }, [refreshSession]);

  return (
    <SessionContext.Provider
      value={{
        user,
        featuredItems,
        loading,
        sessionError,
        refreshSession,
        login,
        logout,
        clearSession
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
