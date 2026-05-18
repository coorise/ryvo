import { z } from "zod";

export const appRoleSchema = z.enum([
  "super_admin",
  "admin",
  "staff",
  "moderator",
  "agent",
  "support",
  "driver",
  "client",
]);

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  primaryRole: appRoleSchema,
  emailVerified: z.boolean(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
