import type { Middleware } from "../types";

/** Stub: JWT verification wired in Phase 3. */
export const authMiddleware: Middleware = async (req, next) => {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Missing bearer token" } },
      { status: 401 },
    );
  }
  return next();
};
