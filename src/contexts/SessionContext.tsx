import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from "react";
import { fetchSession, login as apiLogin, logout as apiLogout } from "../api/client";
import type { Item, User } from "../api/types";

interface SessionContextValue {
  user: User | null;
  featuredItems: Item[];
  loading: boolean;
  refreshSession: (options?: { silent?: boolean }) => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [featuredItems, setFeaturedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setFeaturedItems([]);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const session = await fetchSession();
      setUser(session.user);
      setFeaturedItems(session.items);
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
    void refreshSession();
  }, []);

  return (
    <SessionContext.Provider
      value={{
        user,
        featuredItems,
        loading,
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
