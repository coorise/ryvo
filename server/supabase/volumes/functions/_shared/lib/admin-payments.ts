import { getAdminClient } from "./supabase.ts";
import { getUserEmails } from "./finance-referrals.ts";

export type PaymentAdminRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_intent_id: string | null;
  created_at: string;
  settled_at: string | null;
  trip_id: string | null;
  request_id: string | null;
  rider_id: string;
  rider_email: string;
};

export async function listPaymentsAdmin(opts?: { status?: string; limit?: number }) {
  const db = getAdminClient();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
  let q = db
    .from("payment_intents")
    .select(
      "id,amount,currency,status,provider,provider_intent_id,created_at,settled_at,trip_id,request_id,rider_id",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const emails = await getUserEmails(rows.map((r) => String(r.rider_id)));
  return rows.map((r) => ({
    id: String(r.id),
    amount: Number(r.amount),
    currency: String(r.currency),
    status: String(r.status),
    provider: String(r.provider),
    provider_intent_id: r.provider_intent_id != null ? String(r.provider_intent_id) : null,
    created_at: String(r.created_at),
    settled_at: r.settled_at != null ? String(r.settled_at) : null,
    trip_id: r.trip_id != null ? String(r.trip_id) : null,
    request_id: r.request_id != null ? String(r.request_id) : null,
    rider_id: String(r.rider_id),
    rider_email: emails.get(String(r.rider_id)) ?? String(r.rider_id).slice(0, 8),
  })) satisfies PaymentAdminRow[];
}
