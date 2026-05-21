import { getAdminClient } from "./supabase.ts";

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const db = getAdminClient();
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return hit?.id ?? null;
}

export async function getUserEmail(userId: string): Promise<string> {
  const db = getAdminClient();
  const { data } = await db.auth.admin.getUserById(userId);
  return data.user?.email ?? userId.slice(0, 8);
}

export async function getUserEmails(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(userIds)];
  await Promise.all(
    unique.map(async (id) => {
      map.set(id, await getUserEmail(id));
    }),
  );
  return map;
}

export async function resolveUserRole(userId: string): Promise<"client" | "driver"> {
  const db = getAdminClient();
  const { data } = await db.from("user_roles").select("roles(name)").eq("user_id", userId);
  const names = (data ?? [])
    .map((r) => (r.roles as { name: string } | null)?.name)
    .filter(Boolean) as string[];
  if (names.includes("driver")) return "driver";
  return "client";
}

function inviteRuleKey(
  referrerRole: "client" | "driver",
  invitationType: "client" | "driver",
): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${referrerRole}Invite${cap(invitationType)}`;
}

export function ruleFromSettings(
  config: Record<string, unknown>,
  referrerRole: "client" | "driver",
  invitationType: "client" | "driver",
) {
  const key = inviteRuleKey(referrerRole, invitationType);
  const rule = (config[key] as { condition?: number; targetBonus?: number }) ?? {};
  return {
    condition: Number(rule.condition ?? config.maxReferrals ?? 1),
    targetBonus: Number(rule.targetBonus ?? config.referrerBonusCad ?? 0),
  };
}

export async function listBonusAccounts(accountType: "client" | "driver") {
  const db = getAdminClient();
  const { data, error } = await db
    .from("bonus_accounts")
    .select("*")
    .eq("account_type", accountType)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const emails = await getUserEmails(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    ...r,
    email: emails.get(r.user_id) ?? r.user_id,
  }));
}

export async function upsertBonusAccount(input: {
  user_id: string;
  account_type: "client" | "driver";
  channel?: string;
  balance: number;
}) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("bonus_accounts")
    .upsert(
      {
        user_id: input.user_id,
        account_type: input.account_type,
        channel: input.channel ?? "manual",
        balance: input.balance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,account_type" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  const email = await getUserEmail(data.user_id);
  return { ...data, email };
}

export async function deleteBonusAccount(id: string) {
  const db = getAdminClient();
  const { error } = await db.from("bonus_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listLoyaltyEnriched() {
  const db = getAdminClient();
  const { data, error } = await db
    .from("loyalty_points")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const emails = await getUserEmails(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    ...r,
    email: emails.get(r.user_id) ?? r.user_id,
  }));
}

export async function upsertLoyalty(input: {
  user_id: string;
  points: number;
  cash_balance?: number;
}) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("loyalty_points")
    .upsert(
      {
        user_id: input.user_id,
        points: input.points,
        cash_balance: input.cash_balance ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  const email = await getUserEmail(data.user_id);
  return { ...data, email };
}

export async function listReferralCampaigns(
  referrerRole: "client" | "driver",
  invitationType?: "client" | "driver",
) {
  const db = getAdminClient();
  let q = db
    .from("referral_campaigns")
    .select("*, referral_campaign_joins(referee_id, joined_at)")
    .eq("referrer_role", referrerRole)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (invitationType) q = q.eq("invitation_type", invitationType);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const allIds = rows.flatMap((r) => [
    r.referrer_id,
    ...((r.referral_campaign_joins as { referee_id: string }[]) ?? []).map((j) => j.referee_id),
  ]);
  const emails = await getUserEmails(allIds);
  return rows.map((r) => {
    const joins = (r.referral_campaign_joins as { referee_id: string; joined_at: string }[]) ?? [];
    return {
      id: r.id,
      referrer_id: r.referrer_id,
      referrer_email: emails.get(r.referrer_id) ?? r.referrer_id,
      referrer_role: r.referrer_role,
      invitation_type: r.invitation_type,
      channel: r.channel,
      coupon_code: r.coupon_code,
      condition_required: r.condition_required,
      target_bonus: Number(r.target_bonus),
      goal: r.goal,
      updated_at: r.updated_at,
      joined_emails: joins.map((j) => emails.get(j.referee_id) ?? j.referee_id),
      joined_count: joins.length,
    };
  });
}

export async function createReferralCampaign(input: {
  referrer_id: string;
  referrer_role: "client" | "driver";
  invitation_type: "client" | "driver";
  channel: string;
  coupon_code?: string | null;
  condition_required: number;
  target_bonus: number;
  goal?: string;
  referee_ids?: string[];
}) {
  const db = getAdminClient();
  const { data, error } = await db
    .from("referral_campaigns")
    .insert({
      referrer_id: input.referrer_id,
      referrer_role: input.referrer_role,
      invitation_type: input.invitation_type,
      channel: input.channel,
      coupon_code: input.coupon_code,
      condition_required: input.condition_required,
      target_bonus: input.target_bonus,
      goal: input.goal ?? "pending",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  if (input.referee_ids?.length) {
    await db.from("referral_campaign_joins").insert(
      input.referee_ids.map((referee_id) => ({
        campaign_id: data.id,
        referee_id,
      })),
    );
  }
  const rows = await listReferralCampaigns(input.referrer_role, input.invitation_type);
  return rows.find((r) => r.id === data.id) ?? data;
}

export async function updateReferralCampaign(
  id: string,
  patch: Record<string, unknown>,
) {
  const db = getAdminClient();
  const payload = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await db
    .from("referral_campaigns")
    .update(payload)
    .eq("id", id)
    .select("referrer_role, invitation_type")
    .single();
  if (error) throw new Error(error.message);
  const rows = await listReferralCampaigns(
    data.referrer_role as "client" | "driver",
    data.invitation_type as "client" | "driver",
  );
  return rows.find((r) => r.id === id) ?? data;
}

export async function deleteReferralCampaign(id: string) {
  const db = getAdminClient();
  const { error } = await db.from("referral_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addCampaignJoin(campaignId: string, refereeId: string) {
  const db = getAdminClient();
  await db.from("referral_campaign_joins").upsert(
    { campaign_id: campaignId, referee_id: refereeId },
    { onConflict: "campaign_id,referee_id" },
  );
  const { data: camp } = await db
    .from("referral_campaigns")
    .select("referrer_role, invitation_type, condition_required, target_bonus, referrer_id")
    .eq("id", campaignId)
    .single();
  if (!camp) return;
  const { count } = await db
    .from("referral_campaign_joins")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);
  const joinCount = count ?? 0;
  const goal = joinCount >= camp.condition_required ? "achieved" : "pending";
  await db
    .from("referral_campaigns")
    .update({ goal, updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (goal === "achieved") {
    const { data: acct } = await db
      .from("bonus_accounts")
      .select("balance")
      .eq("user_id", camp.referrer_id)
      .eq("account_type", camp.referrer_role)
      .maybeSingle();
    const balance = Number(acct?.balance ?? 0) + Number(camp.target_bonus);
    await db.from("bonus_accounts").upsert(
      {
        user_id: camp.referrer_id,
        account_type: camp.referrer_role,
        channel: "link",
        balance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,account_type" },
    );
  }
}
