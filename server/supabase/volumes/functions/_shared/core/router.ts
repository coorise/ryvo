import type { AuthContext, RequestContext } from "./context.ts";
import { fail } from "./response.ts";
import { verifyJwt, requirePermission, requireEmailVerified } from "../middleware/auth.ts";
import { rateLimit } from "../lib/redis.ts";

export type RouteHandler = (
  req: Request,
  ctx: RequestContext,
  params: Record<string, string>,
) => Promise<Response>;

export type RouteDef = {
  method: string;
  path: string;
  handler: RouteHandler;
  auth?: boolean;
  permissions?: string[];
  requireVerifiedEmail?: boolean;
  rateLimit?: { limit: number; windowSec: number; keyPrefix?: string };
};

export function createServiceRouter(serviceName: string, routes: RouteDef[]) {
  const compiled = routes.map((r) => ({
    ...r,
    regex: new RegExp(`^${r.path.replace(/:[^/]+/g, "([^/]+)")}$`),
    keys: [...r.path.matchAll(/:([^/]+)/g)].map((m) => m[1]),
  }));

  return async (req: Request): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const url = new URL(req.url);
    const pathname = url.pathname.replace(new RegExp(`^/${serviceName}`), "") || "/";

    const route = compiled.find((r) => r.method === req.method && r.regex.test(pathname));
    if (!route) return fail("NOT_FOUND", "Route not found", 404);

    const ctx: RequestContext = { requestId, serviceName };

    if (route.rateLimit) {
      const ip = req.headers.get("x-forwarded-for") ?? "unknown";
      const key = `${route.rateLimit.keyPrefix ?? serviceName}:${ip}`;
      const rl = await rateLimit(key, route.rateLimit.limit, route.rateLimit.windowSec);
      if (!rl.allowed) return fail("RATE_LIMITED", "Too many requests", 429);
    }

    if (route.auth) {
      const authResult = await verifyJwt(req);
      if (authResult instanceof Response) return authResult;
      ctx.auth = authResult;
      for (const perm of route.permissions ?? []) {
        const denied = requirePermission(authResult, perm);
        if (denied) return denied;
      }
      if (route.requireVerifiedEmail) {
        const denied = requireEmailVerified(authResult);
        if (denied) return denied;
      }
    }

    const match = pathname.match(route.regex);
    const params: Record<string, string> = {};
    route.keys.forEach((k, i) => {
      if (k && match?.[i + 1]) params[k] = match[i + 1];
    });

    return route.handler(req, ctx, params);
  };
}
