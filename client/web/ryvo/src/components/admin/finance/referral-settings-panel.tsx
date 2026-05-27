"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import {
  DEFAULT_CLIENT_PROGRAM,
  DEFAULT_DRIVER_PROGRAM,
  newLoyaltyPackageId,
  type ClientProgramConfig,
  type DriverProgramConfig,
  type LoyaltyPackage,
  type ReferralInviteRule,
} from "@/lib/referral-settings-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ClientSettingsPanelProps = {
  config: ClientProgramConfig;
  onChange: (c: ClientProgramConfig) => void;
  disabled?: boolean;
};

export function ClientProgramSettingsPanel({
  config,
  onChange,
  disabled,
}: ClientSettingsPanelProps) {
  const { t } = useTranslation();

  function patchLoyalty(patch: Partial<ClientProgramConfig["loyalty"]>) {
    onChange({ ...config, loyalty: { ...config.loyalty, ...patch } });
  }

  function patchInvite(
    key: keyof ClientProgramConfig["referrals"],
    patch: Partial<ReferralInviteRule>,
  ) {
    onChange({
      ...config,
      referrals: {
        ...config.referrals,
        [key]: { ...config.referrals[key], ...patch },
      },
    });
  }

  function addPackage() {
    const packages = [
      ...config.loyalty.packages,
      { id: newLoyaltyPackageId(), min_spend_cad: 0, points: 0 },
    ];
    patchLoyalty({ packages });
  }

  function updatePackage(id: string, patch: Partial<LoyaltyPackage>) {
    patchLoyalty({
      packages: config.loyalty.packages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }

  function removePackage(id: string) {
    patchLoyalty({ packages: config.loyalty.packages.filter((p) => p.id !== id) });
  }

  return (
    <div className="border-border bg-card space-y-6 rounded-2xl border p-5">
      <div>
        <h3 className="font-semibold">{t("financeReferrals.clientRules")}</h3>
        <p className="text-muted-foreground text-xs">{t("financeReferrals.clientRulesHint")}</p>
      </div>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">{t("financeReferrals.settings.loyaltyTitle")}</h4>
        <p className="text-muted-foreground text-xs">{t("financeReferrals.settings.loyaltyHint")}</p>
        <div className="space-y-1">
          <Label>{t("financeReferrals.pointsPerDollar")}</Label>
          <Input
            type="number"
            disabled={disabled}
            className="max-w-xs"
            value={config.loyalty.points_per_dollar}
            onChange={(e) => patchLoyalty({ points_per_dollar: Number(e.target.value) })}
          />
          <p className="text-muted-foreground text-xs">{t("financeReferrals.pointsPerDollarHint")}</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("financeReferrals.settings.loyaltyPackages")}</Label>
            {!disabled && (
              <RyvoButton intent="outline" className="h-8 text-xs" onClick={addPackage}>
                <Plus className="size-3.5" /> {t("financeReferrals.settings.addPackage")}
              </RyvoButton>
            )}
          </div>
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="bg-muted/40 text-muted-foreground grid grid-cols-[1fr_1fr_40px] gap-2 px-3 py-2 text-[10px] font-bold tracking-wider uppercase">
              <span>{t("financeReferrals.settings.minSpend")}</span>
              <span>{t("financeReferrals.col.points")}</span>
              <span />
            </div>
            {config.loyalty.packages.map((pkg) => (
              <div
                key={pkg.id}
                className="border-border/60 grid grid-cols-[1fr_1fr_40px] items-center gap-2 border-t px-3 py-2"
              >
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    placeholder="5"
                    value={pkg.min_spend_cad || ""}
                    onChange={(e) =>
                      updatePackage(pkg.id, { min_spend_cad: Number(e.target.value) })
                    }
                  />
                  <span className="text-muted-foreground text-xs">+</span>
                </div>
                <Input
                  type="number"
                  disabled={disabled}
                  value={pkg.points || ""}
                  onChange={(e) => updatePackage(pkg.id, { points: Number(e.target.value) })}
                />
                {!disabled && (
                  <button
                    type="button"
                    className="text-destructive flex size-8 items-center justify-center rounded-full hover:bg-destructive/10"
                    onClick={() => removePackage(pkg.id)}
                    aria-label={t("actions.delete")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
            {!config.loyalty.packages.length && (
              <p className="text-muted-foreground px-3 py-4 text-center text-xs">
                {t("financeReferrals.settings.noPackages")}
              </p>
            )}
          </div>
        </div>
      </section>

      <InviteRuleSection
        title={t("financeReferrals.settings.clientInviteClient")}
        hint={t("financeReferrals.settings.clientInviteClientHint")}
        rule={config.referrals.invite_client}
        onChange={(p) => patchInvite("invite_client", p)}
        showFirstPurchase
        disabled={disabled}
        t={t}
      />

      <InviteRuleSection
        title={t("financeReferrals.settings.clientInviteDriver")}
        hint={t("financeReferrals.settings.clientInviteDriverHint")}
        rule={config.referrals.invite_driver}
        onChange={(p) => patchInvite("invite_driver", p)}
        showDriverEarned
        disabled={disabled}
        t={t}
      />
    </div>
  );
}

type DriverSettingsPanelProps = {
  config: DriverProgramConfig;
  onChange: (c: DriverProgramConfig) => void;
  disabled?: boolean;
};

export function DriverProgramSettingsPanel({
  config,
  onChange,
  disabled,
}: DriverSettingsPanelProps) {
  const { t } = useTranslation();

  function patchInvite(
    key: keyof DriverProgramConfig["referrals"],
    patch: Partial<ReferralInviteRule>,
  ) {
    onChange({
      ...config,
      referrals: {
        ...config.referrals,
        [key]: { ...config.referrals[key], ...patch },
      },
    });
  }

  return (
    <div className="border-border bg-card space-y-6 rounded-2xl border p-5">
      <div>
        <h3 className="font-semibold">{t("financeReferrals.driverRules")}</h3>
        <p className="text-muted-foreground text-xs">{t("financeReferrals.driverRulesHint")}</p>
      </div>

      <InviteRuleSection
        title={t("financeReferrals.settings.driverInviteClient")}
        hint={t("financeReferrals.settings.driverInviteClientHint")}
        rule={config.referrals.invite_client}
        onChange={(p) => patchInvite("invite_client", p)}
        showFirstPurchase
        disabled={disabled}
        t={t}
      />

      <InviteRuleSection
        title={t("financeReferrals.settings.driverInviteDriver")}
        hint={t("financeReferrals.settings.driverInviteDriverHint")}
        rule={config.referrals.invite_driver}
        onChange={(p) => patchInvite("invite_driver", p)}
        showDriverEarned
        disabled={disabled}
        t={t}
      />
    </div>
  );
}

function InviteRuleSection({
  title,
  hint,
  rule,
  onChange,
  showFirstPurchase,
  showDriverEarned,
  disabled,
  t,
}: {
  title: string;
  hint: string;
  rule: ReferralInviteRule;
  onChange: (p: Partial<ReferralInviteRule>) => void;
  showFirstPurchase?: boolean;
  showDriverEarned?: boolean;
  disabled?: boolean;
  t: (k: string) => string;
}) {
  return (
    <section className={cn("border-border space-y-3 rounded-xl border p-4")}>
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("financeReferrals.settings.invitesRequired")}
          hint={t("financeReferrals.settings.invitesRequiredHint")}
          disabled={disabled}
        >
          <Input
            type="number"
            disabled={disabled}
            value={rule.invites_required}
            onChange={(e) => onChange({ invites_required: Number(e.target.value) })}
          />
        </Field>
        <Field label={t("financeReferrals.settings.referrerBonus")} disabled={disabled}>
          <Input
            type="number"
            step="0.01"
            disabled={disabled}
            value={rule.referrer_bonus_cad}
            onChange={(e) => onChange({ referrer_bonus_cad: Number(e.target.value) })}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t("financeReferrals.settings.joinedUserBonus")} disabled={disabled}>
            <Input
              type="number"
              step="0.01"
              disabled={disabled}
              className="max-w-md"
              value={rule.joined_user_bonus_cad}
              onChange={(e) => onChange({ joined_user_bonus_cad: Number(e.target.value) })}
            />
          </Field>
        </div>

        {showFirstPurchase && (
          <>
            <p className="text-muted-foreground sm:col-span-2 text-xs font-semibold">
              {t("financeReferrals.settings.firstPurchaseRowTitle")}
            </p>
            <Field label={t("financeReferrals.settings.firstPurchaseMin")} disabled={disabled}>
              <Input
                type="number"
                step="0.01"
                disabled={disabled}
                value={rule.first_purchase_min_amount_cad}
                onChange={(e) =>
                  onChange({ first_purchase_min_amount_cad: Number(e.target.value) })
                }
              />
            </Field>
            <Field label={t("financeReferrals.settings.firstPurchaseBonus")} disabled={disabled}>
              <Input
                type="number"
                step="0.01"
                disabled={disabled}
                value={rule.referrer_bonus_first_purchase_cad}
                onChange={(e) =>
                  onChange({ referrer_bonus_first_purchase_cad: Number(e.target.value) })
                }
              />
            </Field>
          </>
        )}

        {showDriverEarned && (
          <>
            <p className="text-muted-foreground sm:col-span-2 text-xs font-semibold">
              {t("financeReferrals.settings.driverEarnRowTitle")}
            </p>
            <Field label={t("financeReferrals.settings.driverEarnThreshold")} disabled={disabled}>
              <Input
                type="number"
                step="0.01"
                disabled={disabled}
                value={rule.joined_driver_earn_threshold_cad}
                onChange={(e) =>
                  onChange({ joined_driver_earn_threshold_cad: Number(e.target.value) })
                }
              />
            </Field>
            <Field label={t("financeReferrals.settings.driverEarnBonus")} disabled={disabled}>
              <Input
                type="number"
                step="0.01"
                disabled={disabled}
                value={rule.referrer_bonus_driver_earned_cad}
                onChange={(e) =>
                  onChange({ referrer_bonus_driver_earned_cad: Number(e.target.value) })
                }
              />
            </Field>
          </>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  disabled,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className={cn(disabled && "opacity-60")}>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export { DEFAULT_CLIENT_PROGRAM, DEFAULT_DRIVER_PROGRAM };
