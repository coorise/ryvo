import { env } from "./env.ts";
import { generateOtp6, generateResetToken, hashOtp, hashResetToken } from "./otp.ts";
import { getAdminClient } from "./supabase.ts";

const GENERIC_OK = {
  sent: true,
  message: "If this email is registered, a reset code was sent.",
  expires_minutes: Math.floor(env.mailerOtpExpSec / 60),
};

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  const db = getAdminClient();

  const { data: userId } = await db.rpc("get_user_id_by_email", { p_email: normalized });
  if (!userId) return GENERIC_OK;

  const { data: authUser } = await db.auth.admin.getUserById(userId as string);
  const user = authUser.user;
  if (!user?.email) return GENERIC_OK;

  const otp = generateOtp6();
  const expiresAt = new Date(Date.now() + env.mailerOtpExpSec * 1000).toISOString();

  await db.from("password_reset_challenges").insert({
    user_id: userId,
    email: normalized,
    otp_hash: hashOtp(otp),
    expires_at: expiresAt,
    attempts: 0,
  });

  const userName =
    (user.user_metadata?.full_name as string) ?? user.email.split("@")[0] ?? "there";

  const { error: outboxErr } = await db.from("email_outbox").insert({
    user_id: userId,
    to_email: user.email,
    template_key: "password_reset_otp",
    payload: {
      "user.name": userName,
      "user.email": user.email,
      "otp.code": otp,
      "otp.expires_minutes": String(Math.floor(env.mailerOtpExpSec / 60)),
    },
  });
  if (outboxErr) {
    console.error("[password-reset] outbox enqueue failed", outboxErr);
    return { sent: false, message: "Could not queue reset email. Try again later." };
  }

  return GENERIC_OK;
}

export async function verifyPasswordResetOtp(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  const db = getAdminClient();

  const { data: row } = await db
    .from("password_reset_challenges")
    .select("*")
    .eq("email", normalized)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false as const, error: "INVALID_CODE", message: "Invalid or expired code" };

  if (row.consumed_at || new Date(row.expires_at) < new Date()) {
    return { ok: false as const, error: "EXPIRED", message: "Code expired. Request a new one." };
  }

  if (row.attempts >= row.max_attempts) {
    return { ok: false as const, error: "TOO_MANY_ATTEMPTS", message: "Too many attempts." };
  }

  const match = row.otp_hash === hashOtp(code);
  await db
    .from("password_reset_challenges")
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id);

  if (!match) {
    return { ok: false as const, error: "INVALID_CODE", message: "Invalid code" };
  }

  const resetToken = generateResetToken();
  await db
    .from("password_reset_challenges")
    .update({
      verified_at: new Date().toISOString(),
      reset_token_hash: hashResetToken(resetToken),
    })
    .eq("id", row.id);

  return {
    ok: true as const,
    reset_token: resetToken,
    expires_minutes: Math.floor(env.mailerOtpExpSec / 60),
  };
}

export async function completePasswordReset(
  email: string,
  resetToken: string,
  password: string,
) {
  const normalized = email.trim().toLowerCase();
  const db = getAdminClient();

  const { data: row } = await db
    .from("password_reset_challenges")
    .select("*")
    .eq("email", normalized)
    .is("consumed_at", null)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row?.reset_token_hash || row.reset_token_hash !== hashResetToken(resetToken)) {
    return { ok: false as const, error: "INVALID_TOKEN", message: "Invalid reset session" };
  }

  if (new Date(row.expires_at) < new Date()) {
    return { ok: false as const, error: "EXPIRED", message: "Reset session expired" };
  }

  if (password.length < 8) {
    return { ok: false as const, error: "WEAK_PASSWORD", message: "Minimum 8 characters" };
  }

  const { error } = await db.auth.admin.updateUserById(row.user_id, { password });
  if (error) {
    return { ok: false as const, error: "UPDATE_FAILED", message: error.message };
  }

  await db
    .from("password_reset_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true as const, message: "Password updated. You can sign in." };
}
