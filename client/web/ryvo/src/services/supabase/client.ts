import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_AUTH_COOKIE } from "@/configs/const";
import { env } from "@/configs";

let browserClient: SupabaseClient | null = null;

function supabaseClientOptions() {
  return {
    cookieOptions: { name: SUPABASE_AUTH_COOKIE },
  } as const;
}

/** Browser-only Supabase client (lazy; safe during Next static build). */
export function createSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    const key = env.supabaseAnonKey || "build-placeholder-anon-key";
    return createBrowserClient(env.supabaseUrl, key, supabaseClientOptions());
  }
  if (!browserClient) {
    if (!env.supabaseAnonKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Copy ANON_KEY from server/supabase/.env into client/web/ryvo/.env.local (and client/web/ryvo_admin/.env.local).",
      );
    }
    browserClient = createBrowserClient(
      env.supabaseUrl,
      env.supabaseAnonKey || "build-placeholder-anon-key",
      supabaseClientOptions(),
    );
  }
  return browserClient;
}
