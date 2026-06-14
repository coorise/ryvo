/** Remove pre-isolation Supabase cookie shared across localhost ports. */
export function clearLegacySharedAuthCookies() {
  if (typeof document === "undefined") return;
  const legacyPrefix = "sb-localhost-auth-token";
  for (const part of document.cookie.split(";")) {
    const name = part.trim().split("=")[0] ?? "";
    if (name === legacyPrefix || name.startsWith(`${legacyPrefix}.`)) {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}
