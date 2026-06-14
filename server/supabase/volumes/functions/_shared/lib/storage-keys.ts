/** Returns true when the key points to an object uploaded to Supabase Storage. */
export function isRealStorageKey(key: string | null | undefined): boolean {
  if (!key || !key.trim()) return false;
  if (key.startsWith("pending/")) return false;
  if (key.startsWith("seed/")) return false;
  return true;
}
