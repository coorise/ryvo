"use client";

import { useTranslation } from "react-i18next";

import {
  TARIFF_PACKAGE_TYPES,
  type TariffPackageInput,
} from "@/lib/tariff-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const PAYOUT_PRESETS = [
  "minutes_after_trip",
  "end_of_quota",
  "daily",
  "weekly",
  "monthly",
  "custom",
] as const;

type TariffPackageFormProps = {
  form: TariffPackageInput;
  setForm: (f: TariffPackageInput) => void;
  isNew?: boolean;
  readOnly?: boolean;
};

export function TariffPackageForm({ form, setForm, isNew, readOnly }: TariffPackageFormProps) {
  const { t } = useTranslation();
  const disabled = readOnly;

  function patch(patch: Partial<TariffPackageInput>) {
    setForm({ ...form, ...patch });
  }

  function patchFeatures(patch: Partial<TariffPackageInput["features"]>) {
    setForm({ ...form, features: { ...form.features, ...patch } });
  }

  return (
    <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>{t("financeTariffs.form.name")}</Label>
          <Input
            disabled={disabled}
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("financeTariffs.form.code")}</Label>
          <Input
            disabled={disabled || (!isNew && form.is_system)}
            value={form.code}
            onChange={(e) =>
              patch({ code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })
            }
            placeholder="my_custom_plan"
          />
        </div>
        <div className="space-y-1">
          <Label>{t("financeTariffs.form.type")}</Label>
          <select
            disabled={disabled}
            className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
            value={form.package_type}
            onChange={(e) => patch({ package_type: e.target.value })}
          >
            {TARIFF_PACKAGE_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {t(`financeTariffs.types.${pt}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>{t("financeTariffs.form.description")}</Label>
          <textarea
            disabled={disabled}
            rows={2}
            className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
            value={form.description ?? ""}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <h3 className="text-muted-foreground sm:col-span-2 text-xs font-bold tracking-wider uppercase">
          {t("financeTariffs.form.pricing")}
        </h3>
        <div className="space-y-1">
          <Label>{t("financeTariffs.form.commission")}</Label>
          <Input
            type="number"
            step="0.1"
            disabled={disabled}
            value={form.commission_percent}
            onChange={(e) => patch({ commission_percent: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("financeTariffs.form.discount")}</Label>
          <Input
            type="number"
            disabled={disabled}
            value={form.discount_percent}
            onChange={(e) => patch({ discount_percent: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 sm:col-span-2">
          <div>
            <p className="text-sm font-medium">{t("financeTariffs.form.subscriptionPlan")}</p>
            <p className="text-muted-foreground text-xs">{t("financeTariffs.form.subscriptionHint")}</p>
          </div>
          <Switch
            disabled={disabled}
            checked={form.is_optional_subscription}
            onCheckedChange={(v) =>
              patch({ is_optional_subscription: v, subscription_monthly: v ? form.subscription_monthly ?? 0 : null })
            }
          />
        </div>
        {form.is_optional_subscription && (
          <>
            <div className="space-y-1">
              <Label>{t("financeTariffs.form.monthlyPrice")}</Label>
              <Input
                type="number"
                step="0.01"
                disabled={disabled}
                value={form.subscription_monthly ?? 0}
                onChange={(e) => patch({ subscription_monthly: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("financeTariffs.form.searchBoost")}</Label>
              <Input
                type="number"
                disabled={disabled}
                value={form.search_boost}
                onChange={(e) => patch({ search_boost: Number(e.target.value) })}
              />
            </div>
          </>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <h3 className="text-muted-foreground sm:col-span-2 text-xs font-bold tracking-wider uppercase">
          {t("financeTariffs.form.payoutSection")}
        </h3>
        <div className="space-y-1">
          <Label>{t("financeTariffs.form.payoutCadence")}</Label>
          <select
            disabled={disabled}
            className="border-border bg-background w-full rounded-xl border px-3 py-2 text-sm"
            value={
              PAYOUT_PRESETS.includes(form.payout_cadence as (typeof PAYOUT_PRESETS)[number])
                ? form.payout_cadence
                : "custom"
            }
            onChange={(e) => {
              if (e.target.value !== "custom") patch({ payout_cadence: e.target.value });
            }}
          >
            {PAYOUT_PRESETS.map((p) => (
              <option key={p} value={p}>
                {t(`financeTariffs.payoutPresets.${p}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>{t("financeTariffs.form.payoutCustom")}</Label>
          <Input
            disabled={disabled}
            value={form.payout_cadence}
            onChange={(e) => patch({ payout_cadence: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("financeTariffs.form.payoutDelay")}</Label>
          <Input
            type="number"
            disabled={disabled}
            value={form.payout_delay_minutes}
            onChange={(e) => patch({ payout_delay_minutes: Number(e.target.value) })}
          />
          <p className="text-muted-foreground text-xs">{t("financeTariffs.form.payoutDelayHint")}</p>
        </div>
        {form.package_type === "per_quota" && (
          <div className="space-y-1">
            <Label>{t("financeTariffs.form.quotaTrips")}</Label>
            <Input
              type="number"
              disabled={disabled}
              value={form.quota_trips ?? 0}
              onChange={(e) => patch({ quota_trips: Number(e.target.value) })}
            />
          </div>
        )}
      </section>

      <section className="border-border space-y-3 rounded-xl border p-4">
        <h3 className="text-sm font-semibold">{t("financeTariffs.form.featuresTitle")}</h3>
        <FeatureRow
          label={t("financeTariffs.features.searchPriority")}
          hint={t("financeTariffs.features.searchPriorityHint")}
          checked={form.features.search_priority}
          disabled={disabled}
          onCheckedChange={(v) => patchFeatures({ search_priority: v })}
        />
        <FeatureRow
          label={t("financeTariffs.features.promotedListing")}
          hint={t("financeTariffs.features.promotedListingHint")}
          checked={form.features.promoted_listing}
          disabled={disabled}
          onCheckedChange={(v) => patchFeatures({ promoted_listing: v })}
        />
        <FeatureRow
          label={t("financeTariffs.features.mediaGallery")}
          hint={t("financeTariffs.features.mediaGalleryHint")}
          checked={form.features.media_gallery}
          disabled={disabled}
          onCheckedChange={(v) => patchFeatures({ media_gallery: v })}
        />
        {form.features.media_gallery && (
          <div className="grid grid-cols-2 gap-2 pl-4">
            <div className="space-y-1">
              <Label>{t("financeTariffs.features.maxPhotos")}</Label>
              <Input
                type="number"
                disabled={disabled}
                value={form.features.max_photos}
                onChange={(e) => patchFeatures({ max_photos: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("financeTariffs.features.maxVideos")}</Label>
              <Input
                type="number"
                disabled={disabled}
                value={form.features.max_videos}
                onChange={(e) => patchFeatures({ max_videos: Number(e.target.value) })}
              />
            </div>
          </div>
        )}
        <FeatureRow
          label={t("financeTariffs.features.customBadge")}
          checked={form.features.custom_badge}
          disabled={disabled}
          onCheckedChange={(v) => patchFeatures({ custom_badge: v })}
        />
        {form.features.custom_badge && (
          <div className="space-y-1 pl-4">
            <Label>{t("financeTariffs.features.badgeLabel")}</Label>
            <Input
              disabled={disabled}
              value={form.features.badge_label}
              onChange={(e) => patchFeatures({ badge_label: e.target.value })}
              placeholder="Pro"
            />
          </div>
        )}
        <FeatureRow
          label={t("financeTariffs.features.prioritySupport")}
          checked={form.features.priority_support}
          disabled={disabled}
          onCheckedChange={(v) => patchFeatures({ priority_support: v })}
        />
      </section>

      <div className="flex items-center justify-between">
        <Label>{t("financeTariffs.form.active")}</Label>
        <Switch
          disabled={disabled}
          checked={form.active}
          onCheckedChange={(v) => patch({ active: v })}
        />
      </div>
    </div>
  );
}

function FeatureRow({
  label,
  hint,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function TariffFeatureChips({ form }: { form: TariffPackageInput }) {
  const { t } = useTranslation();
  const chips: string[] = [];
  if (form.features.search_priority) chips.push(t("financeTariffs.features.searchPriority"));
  if (form.features.promoted_listing) chips.push(t("financeTariffs.features.promotedListing"));
  if (form.features.media_gallery) {
    chips.push(
      `${t("financeTariffs.features.mediaGallery")} (${form.features.max_photos}/${form.features.max_videos})`,
    );
  }
  if (form.features.custom_badge && form.features.badge_label) {
    chips.push(form.features.badge_label);
  }
  if (form.discount_percent > 0) chips.push(`-${form.discount_percent}%`);
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className={cn("bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-semibold")}
        >
          {c}
        </span>
      ))}
      {!chips.length && (
        <span className="text-muted-foreground text-[10px]">{t("financeTariffs.noFeatures")}</span>
      )}
    </div>
  );
}
