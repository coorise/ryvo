import { emitAudit } from "../deps.ts";
import { getAdminClient } from "../deps.ts";

export async function setUserEmailVerified(
  actorId: string,
  userId: string,
  isEmailVerified: boolean,
) {
  const db = getAdminClient();
  const { error } = await db.rpc("admin_set_email_verified", {
    p_user_id: userId,
    p_verified: isEmailVerified,
  });
  if (error) throw new Error(error.message);
  await emitAudit(actorId, "user.email_verified", "user", userId, {
    is_email_verified: isEmailVerified,
  });
  return { user_id: userId, is_email_verified: isEmailVerified };
}
