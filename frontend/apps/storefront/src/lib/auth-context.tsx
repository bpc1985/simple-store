"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { UserDto } from "@/types";
import type { TokenResponse } from "@/types";
import { useMe } from "@/hooks/use-auth";
import * as identityService from "@/services/identity-service";
import { setAccessToken } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserDto | undefined;
  isLoading: boolean;
  login: (tokens: TokenResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: undefined,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: user, isLoading, isError } = useMe();

  const login = useCallback((tokens: TokenResponse) => {
    setAccessToken(tokens.accessToken);
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  const logout = useCallback(() => {
    identityService.logout("").catch(() => {});
    setAccessToken(null);
    queryClient.invalidateQueries({ queryKey: ["me"] });
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  }, [queryClient]);

  const isAuthenticated = !isError && !!user;

  if (!mounted) {
    return (
      <AuthContext.Provider
        value={{
          isAuthenticated: false,
          user: undefined,
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
        isAuthenticated,
        user,
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
