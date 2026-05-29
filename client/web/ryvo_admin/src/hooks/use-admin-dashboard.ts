"use client";

import { useQuery } from "@tanstack/react-query";

import { gatewayRetryDelay, retryGatewayUnavailable } from "@/lib/query-retry";
import { adminService } from "@/services";
import { useAuth } from "./use-auth";

export function useAdminDashboard() {
  const { accessToken, isReady } = useAuth();

  return useQuery({
    queryKey: ["admin", "dashboard", accessToken],
    queryFn: () => adminService.getDashboard(accessToken),
    enabled: isReady && Boolean(accessToken),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: retryGatewayUnavailable,
    retryDelay: gatewayRetryDelay,
  });
}
