import { z } from "zod";

export const platformPreferencesSchema = z.object({
  appName: z.string(),
  timeZone: z.string(),
  defaultLanguage: z.string(),
  supportedLanguages: z.array(z.string()),
  currency: z.string().optional(),
  country: z.string().optional(),
});

export type PlatformPreferences = z.infer<typeof platformPreferencesSchema>;
