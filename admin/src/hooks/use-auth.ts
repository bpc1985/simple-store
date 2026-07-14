"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { TOKEN_KEY } from "@/lib/api";
import * as identityService from "@/services/identity-service";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      identityService.login(email, password),
    onSuccess: (data) => {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/");
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      if (!token) return null;
      return { token };
    },
    staleTime: Infinity,
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem(TOKEN_KEY);
    queryClient.clear();
    router.push("/login");
  };
}
