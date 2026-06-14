import { createServiceRouter } from "../../../../_shared/core/router.ts";
import { ok, fail } from "../../../../_shared/core/response.ts";
import { getAdminClient } from "../../../../_shared/lib/supabase.ts";

import type { RouteDef } from "../../../../_shared/core/router.ts";

export const routes: RouteDef[] = [{
    method: "POST",
    path: "/v1/upload-url",
    auth: true,
    handler: async (req, ctx) => {
      const { bucket, path, content_type } = await req.json();
      const db = getAdminClient();
      const objectPath = `${ctx.auth!.userId}/${path}`;
      if (objectPath.includes("..")) return fail("VALIDATION", "Invalid path", 422);
      const { data, error } = await db.storage.from(bucket ?? "ryvo-storage").createSignedUploadUrl(
        objectPath,
{ upsert: true },
      );
      if (error) return fail("STORAGE_ERROR", error.message, 500);
      return ok({ ...data, path: objectPath, content_type });
    },
  },
{
    method: "POST",
    path: "/v1/signed-read",
    auth: true,
    handler: async (req, ctx) => {
      const { bucket, path, expires_in } = await req.json();
      if (!path || typeof path !== "string") return fail("VALIDATION", "path required", 422);
      if (path.includes("..")) return fail("VALIDATION", "Invalid path", 422);
      if (!path.startsWith(`${ctx.auth!.userId}/`)) {
        return fail("FORBIDDEN", "Cannot read this object", 403);
      }
      const db = getAdminClient();
      const { data, error } = await db.storage
        .from(bucket ?? "ryvo-storage")
        .createSignedUrl(path, expires_in ?? 3600);
      if (error) return fail("STORAGE_ERROR", error.message, 500);
      return ok(data);
    },
  },];
