import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.ts";

let admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
