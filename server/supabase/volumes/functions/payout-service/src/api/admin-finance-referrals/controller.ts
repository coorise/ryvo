import type { RouteDef } from "../../../../_shared/core/router.ts";
import { z, createReferralCampaign, deleteBonusAccount, deleteReferralCampaign, emitAudit, fail, getAdminClient, getReferralSettings, getUserEmail, getUserIdByEmail, listBonusAccounts, listLoyaltyEnriched, listReferralCampaigns, ok, seedDemoFinanceIfEmpty, updateReferralCampaign, updateReferralSettings, upsertBonusAccount, upsertLoyalty } from "../deps.ts";

import type { RouteHandler } from "../../../../_shared/core/router.ts";
import * as service from "./service.ts";
import * as validator from "./validator.ts";

export const get_v1_admin_finance_referrals_settings: RouteHandler = async () =>
  ok(await getReferralSettings());

export const patch_v1_admin_finance_referrals_settings: RouteHandler = async (req, ctx) => {
      const body = await req.json();
      const data = await updateReferralSettings(body.client_config ?? {}, body.driver_config ?? {});
      await emitAudit(ctx.auth!.userId, "referral_settings.update", "referral_settings", "default", {});
      return ok(data);
    };

export const get_v1_admin_finance_referrals: RouteHandler = async () => {
      await seedDemoFinanceIfEmpty();
      const [clientBonuses, driverBonuses, loyalty, clientCampaigns, driverCampaigns] =
        await Promise.all([
          listBonusAccounts("client"),
          listBonusAccounts("driver"),
          listLoyaltyEnriched(),
          listReferralCampaigns("client"),
          listReferralCampaigns("driver"),
        ]);
      return ok({
        clientBonuses,
        driverBonuses,
        loyalty,
        clientCampaigns,
        driverCampaigns,
      });
    };

export const get_v1_admin_finance_referrals_bonuses: RouteHandler = async (req) => {
      const type = new URL(req.url).searchParams.get("account_type") === "driver" ? "driver" : "client";
      return ok({ bonuses: await listBonusAccounts(type) });
    };

export const post_v1_admin_finance_referrals_bonuses: RouteHandler = async (req, ctx) => {
      const body = z
        .object({
          email: z.string().email(),
          account_type: z.enum(["client", "driver"]),
          channel: z.enum(["link", "coupon", "loyalty", "manual"]).optional(),
          balance: z.number().min(0),
        })
        .parse(await req.json());
      const userId = await getUserIdByEmail(body.email);
      if (!userId) return fail("NOT_FOUND", "User not found", 404);
      const row = await upsertBonusAccount({
        user_id: userId,
        account_type: body.account_type,
        channel: body.channel,
        balance: body.balance,
      });
      await emitAudit(ctx.auth!.userId, "bonus.upsert", "bonus_accounts", row.id, {});
      return ok({ bonus: row });
    };

export const patch_v1_admin_finance_referrals_bonuses_id: RouteHandler = async (req, ctx, params) => {
      const body = z
        .object({
          channel: z.enum(["link", "coupon", "loyalty", "manual"]).optional(),
          balance: z.number().min(0).optional(),
        })
        .parse(await req.json());
      const db = getAdminClient();
      const { data, error } = await db
        .from("bonus_accounts")
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq("id", params.id)
        .select()
        .single();
      if (error) return fail("DB_ERROR", error.message, 500);
      return ok({ bonus: { ...data, email: await getUserEmail(data.user_id) } });
    };

export const delete_v1_admin_finance_referrals_bonuses_id: RouteHandler = async (_req, ctx, params) => {
      await deleteBonusAccount(params.id);
      await emitAudit(ctx.auth!.userId, "bonus.delete", "bonus_accounts", params.id, {});
      return ok({ deleted: true });
    };

export const post_v1_admin_finance_referrals_loyalty: RouteHandler = async (req, ctx) => {
      const body = z
        .object({
          email: z.string().email(),
          points: z.number().min(0),
        })
        .parse(await req.json());
      const userId = await getUserIdByEmail(body.email);
      if (!userId) return fail("NOT_FOUND", "User not found", 404);
      const row = await upsertLoyalty({ user_id: userId, points: body.points });
      await emitAudit(ctx.auth!.userId, "loyalty.upsert", "loyalty_points", userId, {});
      return ok({ loyalty: row });
    };

export const post_v1_admin_finance_referrals_campaigns: RouteHandler = async (req, ctx) => {
      const body = z
        .object({
          referrer_email: z.string().email(),
          referrer_role: z.enum(["client", "driver"]),
          invitation_type: z.enum(["client", "driver"]),
          channel: z.enum(["link", "coupon", "manual"]),
          coupon_code: z.string().nullable().optional(),
          condition_required: z.number().min(1),
          target_bonus: z.number().min(0),
          goal: z.enum(["pending", "achieved"]).optional(),
          joined_emails: z.array(z.string().email()).optional(),
        })
        .parse(await req.json());
      const referrerId = await getUserIdByEmail(body.referrer_email);
      if (!referrerId) return fail("NOT_FOUND", "Referrer not found", 404);
      const refereeIds: string[] = [];
      for (const em of body.joined_emails ?? []) {
        const id = await getUserIdByEmail(em);
        if (id) refereeIds.push(id);
      }
      const row = await createReferralCampaign({
        referrer_id: referrerId,
        referrer_role: body.referrer_role,
        invitation_type: body.invitation_type,
        channel: body.channel,
        coupon_code: body.coupon_code,
        condition_required: body.condition_required,
        target_bonus: body.target_bonus,
        goal: body.goal,
        referee_ids: refereeIds,
      });
      await emitAudit(ctx.auth!.userId, "campaign.create", "referral_campaigns", row.id, {});
      return ok({ campaign: row });
    };

export const patch_v1_admin_finance_referrals_campaigns_id: RouteHandler = async (req, ctx, params) => {
      const body = z
        .object({
          channel: z.enum(["link", "coupon", "manual"]).optional(),
          condition_required: z.number().min(1).optional(),
          target_bonus: z.number().min(0).optional(),
          goal: z.enum(["pending", "achieved"]).optional(),
        })
        .parse(await req.json());
      const row = await updateReferralCampaign(params.id, body);
      await emitAudit(ctx.auth!.userId, "campaign.update", "referral_campaigns", params.id, {});
      return ok({ campaign: row });
    };

export const delete_v1_admin_finance_referrals_campaigns_id: RouteHandler = async (_req, ctx, params) => {
      await deleteReferralCampaign(params.id);
      await emitAudit(ctx.auth!.userId, "campaign.delete", "referral_campaigns", params.id, {});
      return ok({ deleted: true });
    };
