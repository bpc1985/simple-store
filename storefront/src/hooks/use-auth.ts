"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as identityService from "@/services/identity-service";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      identityService.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      email,
      password,
      fullName,
    }: {
      email: string;
      password: string;
      fullName: string;
    }) => identityService.register(email, password, fullName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) return identityService.logout(refreshToken);
      return Promise.resolve();
    },
    onSettled: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: identityService.getMe,
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
