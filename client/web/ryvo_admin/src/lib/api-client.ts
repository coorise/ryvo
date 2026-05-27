import { env } from "@/configs/env";
import { ApiError, isApiErrorBody, type ApiSuccess } from "@/configs/http";

export type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  service: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${env.functionsBaseUrl}/${service}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: env.supabaseAnonKey,
    ...options.headers,
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isApiErrorBody(json)) {
      throw new ApiError(
        json.error?.code ?? "API_ERROR",
        json.error?.message ?? res.statusText,
        res.status,
        json.error?.details as Record<string, unknown> | undefined,
      );
    }
    throw new ApiError("HTTP_ERROR", res.statusText, res.status);
  }
  return (json as ApiSuccess<T>).data ?? (json as T);
}
