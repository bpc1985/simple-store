"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "@/lib/api";
import * as identityService from "@/services/identity-service";

const REFRESH_KEY = "admin-refresh-token";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      identityService.login(email, password),
    onSuccess: (data) => {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/");
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => identityService.getMe(),
    enabled: typeof window !== "undefined" && !!localStorage.getItem(TOKEN_KEY),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (refreshToken) return identityService.logout(refreshToken);
      return Promise.resolve();
    },
    onSettled: () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      queryClient.clear();
      router.push("/login");
    },
  });
}
