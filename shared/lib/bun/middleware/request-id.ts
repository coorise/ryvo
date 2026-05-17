import type { Middleware } from "../types";

export const requestIdMiddleware: Middleware = async (req, next) => {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
