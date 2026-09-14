import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { setUnauthorizedHandler } from "../api/client";
import { getTokenExpiryMs, getUserIdFromToken, isTokenExpired } from "./jwt";

const TOKEN_STORAGE_KEY = "access_token";

interface AuthContextValue {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredToken(): string | null {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  if (isTokenExpired(stored)) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
  return stored;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    setToken(null);
  }, []);

  const login = useCallback((nextToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
  }, []);

  // Any authenticated API call that comes back 401 (expired/invalid token) logs us out.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Schedule an automatic logout for the moment the current token's `exp` is reached,
  // so an idle tab signs itself out without waiting for the next API call to 401.
  useEffect(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (!token) return;

    const expiryMs = getTokenExpiryMs(token);
    if (expiryMs === null) return;

    const msUntilExpiry = expiryMs - Date.now();
    if (msUntilExpiry <= 0) {
      logout();
      return;
    }

    logoutTimerRef.current = setTimeout(logout, msUntilExpiry);
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [token, logout]);

  const userId = useMemo(() => (token ? getUserIdFromToken(token) : null), [token]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, userId, isAuthenticated: token !== null, login, logout }),
    [token, userId, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
