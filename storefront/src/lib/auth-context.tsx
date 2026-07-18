"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { UserDto } from "@/types";
import { useMe } from "@/hooks/use-auth";

interface AuthContextType {
  token: string | null;
  user: UserDto | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: undefined,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setMounted(true);
  }, []);

  const { data: user, isLoading } = useMe();

  const login = useCallback((accessToken: string, refreshToken?: string) => {
    localStorage.setItem("token", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    setToken(accessToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setToken(null);
  }, []);

  const isAuthenticated = !!token;

  if (!mounted) {
    return (
      <AuthContext.Provider
        value={{
          token: null,
          user: undefined,
          isAuthenticated: false,
          isLoading: true,
          login,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        isLoading: isLoading || !mounted,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
