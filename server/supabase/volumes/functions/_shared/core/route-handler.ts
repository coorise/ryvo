import type { RouteHandler } from "./router.ts";

/** Wrap a controller method as a RouteDef handler (identity; keeps typing explicit). */
export function asHandler(fn: RouteHandler): RouteHandler {
  return fn;
}
