import { getAdminClient } from "./supabase.ts";

export type SelfProfile = {
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  locale: string | null;
  bio: string | null;
  roles: string[];
};

export async function getSelfProfile(userId: string): Promise<SelfProfile> {
  const db = getAdminClient();
  const { data: authUser } = await db.auth.admin.getUserById(userId);
  if (!authUser.user) throw new Error("User not found");

  const { data: profile } = await db
    .from("user_profiles")
    .select(
      "username, display_name, phone, avatar_url, address_line1, address_line2, city, region, postal_code, country, locale, bio",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const { data: roleRows } = await db
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  const roles = (roleRows ?? [])
    .map((r) => (r.roles as { name: string } | null)?.name)
    .filter(Boolean) as string[];

  const meta = authUser.user.user_metadata ?? {};

  return {
    user_id: userId,
    email: authUser.user.email ?? "",
    username: profile?.username ?? (meta.username as string) ?? null,
    display_name: profile?.display_name ?? (meta.display_name as string) ?? null,
    full_name: (meta.full_name as string) ?? profile?.display_name ?? null,
    phone: profile?.phone ?? (meta.phone as string) ?? authUser.user.phone ?? null,
    avatar_url: profile?.avatar_url ?? (meta.avatar_url as string) ?? null,
    address_line1: profile?.address_line1 ?? null,
    address_line2: profile?.address_line2 ?? null,
    city: profile?.city ?? null,
    region: profile?.region ?? null,
    postal_code: profile?.postal_code ?? null,
    country: profile?.country ?? null,
    locale: profile?.locale ?? null,
    bio: profile?.bio ?? null,
    roles,
  };
}

export async function updateSelfProfile(
  userId: string,
  input: Partial<
    Pick<
      SelfProfile,
      | "username"
      | "display_name"
      | "full_name"
      | "phone"
      | "avatar_url"
      | "address_line1"
      | "address_line2"
      | "city"
      | "region"
      | "postal_code"
      | "country"
      | "locale"
      | "bio"
    >
  >,
): Promise<SelfProfile> {
  const db = getAdminClient();

  if (input.username) {
    const { data: taken } = await db
      .from("user_profiles")
      .select("user_id")
      .ilike("username", input.username)
      .neq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (taken) throw new Error("Username already taken");
  }

  const profilePatch: Record<string, unknown> = { user_id: userId };
  for (const key of [
    "username",
    "display_name",
    "phone",
    "avatar_url",
    "address_line1",
    "address_line2",
    "city",
    "region",
    "postal_code",
    "country",
    "locale",
    "bio",
  ] as const) {
    if (input[key] !== undefined) profilePatch[key] = input[key];
  }

  await db.from("user_profiles").upsert(profilePatch);

  const meta: Record<string, unknown> = {};
  if (input.full_name !== undefined) meta.full_name = input.full_name;
  if (input.display_name !== undefined) meta.display_name = input.display_name;
  if (input.phone !== undefined) meta.phone = input.phone;
  if (input.avatar_url !== undefined) meta.avatar_url = input.avatar_url;
  if (input.username !== undefined) meta.username = input.username;

  if (Object.keys(meta).length > 0) {
    const { error } = await db.auth.admin.updateUserById(userId, { user_metadata: meta });
    if (error) throw new Error(error.message);
  }

  if (input.phone !== undefined) {
    const { error } = await db.auth.admin.updateUserById(userId, { phone: input.phone });
    if (error && !error.message.includes("phone")) throw new Error(error.message);
  }

  return getSelfProfile(userId);
}
