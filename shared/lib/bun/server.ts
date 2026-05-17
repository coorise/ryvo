import type { CreateBunServerOptions, HttpMethod, Middleware, Router } from "./types";
import {
  authMiddleware,
  loggerMiddleware,
  rateLimitMiddleware,
  requestIdMiddleware,
} from "./middleware";

const middlewareByName: Record<string, Middleware> = {
  auth: authMiddleware,
  "rate-limit": rateLimitMiddleware,
  "request-id": requestIdMiddleware,
  logger: loggerMiddleware,
};

function matchRoute(router: Router, pathname: string, method: string) {
  const exact = router[pathname]?.[method as HttpMethod];
  if (exact) return exact;

  for (const [pattern, handlers] of Object.entries(router)) {
    if (!pattern.includes(":")) continue;
    const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}$`);
    if (regex.test(pathname)) return handlers[method as HttpMethod];
  }
  return undefined;
}

export function createBunServer(options: CreateBunServerOptions) {
  const chain = (options.middleware ?? [])
    .map((name) => middlewareByName[name])
    .filter((m): m is Middleware => Boolean(m));

  const compose = (handler: (req: Request) => Promise<Response>) =>
    chain.reduceRight(
      (next, middleware) => (req: Request) => middleware(req, () => next(req)),
      handler,
    );

  const fetchHandler = compose(async (req: Request) => {
    const url = new URL(req.url);
    const handler = matchRoute(options.router, url.pathname, req.method);
    if (!handler) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Route not found" } },
        { status: 404 },
      );
    }
    return handler(req);
  });

  return {
    start() {
      const server = Bun.serve({
        port: options.port,
        fetch: fetchHandler,
      });
      console.log(`[ryvo] Server started on http://localhost:${server.port}`);
      return server;
    },
  };
}
