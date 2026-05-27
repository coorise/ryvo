import type { Middleware } from "../types";

export const loggerMiddleware: Middleware = async (req, next) => {
  const started = Date.now();
  const response = await next();
  console.log(
    JSON.stringify({
      level: "info",
      method: req.method,
      path: new URL(req.url).pathname,
      status: response.status,
      duration_ms: Date.now() - started,
    }),
  );
  return response;
};
