"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as identityService from "@/services/identity-service";

export function useUsers(page: number) {
  return useQuery({
    queryKey: ["users", page],
    queryFn: () => identityService.getUsers(page),
  });
}

export function useLockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => identityService.lockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User locked");
    },
    onError: () => toast.error("Failed to lock user"),
  });
}

export function useUnlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => identityService.unlockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User unlocked");
    },
    onError: () => toast.error("Failed to unlock user"),
  });
}
