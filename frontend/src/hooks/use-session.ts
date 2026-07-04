"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/pacta";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: authApi.me,
    retry: false
  });
}

export function useRequireSession() {
  const router = useRouter();
  const query = useSession();

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      router.replace("/login");
    }
  }, [query.error, router]);

  return query;
}

export function useClearSessionCache() {
  const queryClient = useQueryClient();
  return () => queryClient.removeQueries({ queryKey: ["session"] });
}
