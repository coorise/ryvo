/** True when the key references an object in Supabase Storage (not a bootstrap placeholder). */
export function isRealStorageKey(key: string | null | undefined): boolean {
  if (!key?.trim()) return false;
  if (key.startsWith("pending/")) return false;
  if (key.startsWith("seed/")) return false;
  return true;
}
