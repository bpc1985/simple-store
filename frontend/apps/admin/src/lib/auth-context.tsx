"use client";

import { createContext, useContext, useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as identityService from "@/services/identity-service";
import { setAccessToken } from "@/lib/api";
import { TokenResponse } from "@/types";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<TokenResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Session recovery on mount/page-refresh: check /me via cookie
  useEffect(() => {
    identityService.getMe()
      .then(() => {
        // ME succeeded — session is valid. Access token not needed
        // until API call hits 401 (then refresh interceptor handles it).
        setToken("authenticated");
      })
      .catch(() => {
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await identityService.login(email, password);
    setAccessToken(data.accessToken);
    setToken(data.accessToken);
    return data;
  }, []);

  const logout = useCallback(() => {
    identityService.logout().catch(() => {});
    setAccessToken(null);
    setToken(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ isAuthenticated: !!token, isLoading: loading, login, logout }),
    [token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
