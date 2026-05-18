import { getAdminClient } from "./supabase.ts";

export type PlatformPreferences = {
  appName: string;
  timeZone: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  currency?: string;
  country?: string;
};

const DEFAULT_PREFERENCES: PlatformPreferences = {
  appName: "Ryvo-Line",
  timeZone: "America/Toronto",
  defaultLanguage: "en",
  supportedLanguages: ["en", "fr", "es", "zh", "de"],
  currency: "CAD",
  country: "CA",
};

export async function getPlatformPreferences(): Promise<PlatformPreferences> {
  const db = getAdminClient();
  const { data } = await db
    .from("platform_settings")
    .select("preferences")
    .eq("id", "default")
    .maybeSingle();
  if (!data?.preferences || typeof data.preferences !== "object") {
    return DEFAULT_PREFERENCES;
  }
  return { ...DEFAULT_PREFERENCES, ...(data.preferences as PlatformPreferences) };
}

export async function updatePlatformPreferences(
  preferences: Partial<PlatformPreferences>,
  updatedBy: string,
): Promise<PlatformPreferences> {
  const current = await getPlatformPreferences();
  const merged = { ...current, ...preferences };
  const db = getAdminClient();
  const { error } = await db.from("platform_settings").upsert({
    id: "default",
    preferences: merged,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return merged;
}
