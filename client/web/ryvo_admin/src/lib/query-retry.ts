import { ApiError } from "@/configs/http";

/** Retry when Kong/functions gateway is briefly unavailable (503/502). */
export function retryGatewayUnavailable(failureCount: number, error: unknown): boolean {
  if (failureCount >= 4) return false;
  if (error instanceof ApiError && (error.status === 503 || error.status === 502)) return true;
  return false;
}

export function gatewayRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 8000);
}
