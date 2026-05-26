// Re-exports used by this service route modules.
export { z } from "zod";
export { ok } from "../../../_shared/core/response.ts";
export { fail } from "../../../_shared/core/response.ts";
export { requireRole } from "../../../_shared/middleware/auth.ts";
export { getAdminDashboard } from "../../../_shared/lib/admin-dashboard.ts";
export { getAdminAnalytics } from "../../../_shared/lib/admin-analytics.ts";
