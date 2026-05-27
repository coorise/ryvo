export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:8400",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  functionsBaseUrl:
    process.env.NEXT_PUBLIC_FUNCTIONS_URL ??
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:8400"}/functions/v1`,
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  isDev: (process.env.NEXT_PUBLIC_APP_ENV ?? "development") === "development",
} as const;
