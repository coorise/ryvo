export const env = {
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: process.env.SUPABASE_URL ?? "http://localhost:8400",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};
