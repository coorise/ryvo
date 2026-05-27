import { z } from "zod";

export const setEmailVerifiedSchema = z.object({
  is_email_verified: z.boolean(),
});
