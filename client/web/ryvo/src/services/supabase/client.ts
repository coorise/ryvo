import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/configs";

let browserClient: SupabaseClient | null = null;

/** Browser-only Supabase client (lazy; safe during Next static build). */
export function createSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    const key = env.supabaseAnonKey || "build-placeholder-anon-key";
    return createBrowserClient(env.supabaseUrl, key);
  }
  if (!browserClient) {
    if (!env.supabaseAnonKey) {
      console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
    }
    browserClient = createBrowserClient(
      env.supabaseUrl,
      env.supabaseAnonKey || "build-placeholder-anon-key",
    );
  }
  return browserClient;
}
