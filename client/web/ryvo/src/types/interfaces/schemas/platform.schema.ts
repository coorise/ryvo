import { z } from "zod";

export const platformPreferencesSchema = z.object({
  appName: z.string(),
  timeZone: z.string(),
  defaultLanguage: z.string(),
  supportedLanguages: z.array(z.string()),
  currency: z.string().optional(),
  country: z.string().optional(),
  supportEmail: z.string().optional(),
  supportPhone: z.string().optional(),
  defaultMapCenter: z.object({ lat: z.number(), lng: z.number() }).optional(),
  maxSearchRadiusKm: z.number().optional(),
  cancelWindowMinutes: z.number().optional(),
  driverAcceptTimeoutSec: z.number().optional(),
  scheduledRideEnabled: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
});

export type PlatformPreferences = z.infer<typeof platformPreferencesSchema>;
