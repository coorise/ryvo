"use client";

import { CheckCircle2, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StarRating } from "@/components/admin/star-rating";
import { PROFILE_VARIANT, type ProfileVariant, UI } from "@/configs/const";
import { formatDateOnly, formatTimestamp } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export type ProfileHeaderData = {
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
  rating_avg?: number;
  trip_count?: number;
  created_at: string;
  updated_at?: string;
  email_verified?: boolean;
  profile_verified?: boolean;
  kyc_status?: string | null;
  roles?: string[];
  phone?: string | null;
};

type ProfileHeaderProps = {
  user: ProfileHeaderData;
  variant?: ProfileVariant;
};

export function ProfileHeader({ user, variant = PROFILE_VARIANT.client }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const displayName = user.full_name ?? user.email;
  const isDriver = variant === PROFILE_VARIANT.driver;
  const isStaff = variant === PROFILE_VARIANT.staff;

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="from-primary/15 h-28 bg-gradient-to-r to-transparent" />
      <div className="relative px-6 pb-6">
        <div
          className="border-background bg-muted absolute -top-14 flex items-center justify-center overflow-hidden rounded-full border-4 shadow-md"
          style={{ width: UI.profileAvatarSize, height: UI.profileAvatarSize }}
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <User className="text-muted-foreground size-10" />
          )}
        </div>
        <div className="pt-16">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              {user.phone && <p className="text-muted-foreground text-sm">{user.phone}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {user.email_verified && (
                <span className="bg-primary/15 text-primary inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase">
                  <CheckCircle2 className="size-3" />
                  {t("profile.emailVerified")}
                </span>
              )}
              {isDriver && (user.profile_verified || user.kyc_status === "approved") && (
                <span className="bg-primary/15 text-primary inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase">
                  <CheckCircle2 className="size-3" />
                  {t("profile.verified")}
                </span>
              )}
              {isDriver && user.kyc_status && user.kyc_status !== "approved" && (
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                    user.kyc_status === "rejected"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-amber-500/15 text-amber-700",
                  )}
                >
                  {t("drivers.kycStatus")}: {user.kyc_status}
                </span>
              )}
              {isStaff && (
                <span className="bg-muted text-foreground rounded-md px-2 py-0.5 text-[10px] font-bold uppercase">
                  {t("profile.internalStaff")}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-6">
            {isDriver && (
              <>
                <div>
                  <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    {t("profile.rating")}
                  </p>
                  <StarRating value={user.rating_avg ?? 0} />
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                    {t("profile.trips")}
                  </p>
                  <p className="text-lg font-bold">{user.trip_count ?? 0}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                {t("profile.memberSince")}
              </p>
              <p className="text-sm font-medium">{formatDateOnly(user.created_at)}</p>
            </div>
            {user.updated_at && (
              <div>
                <p className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                  {t("profile.updatedAt")}
                </p>
                <p className="text-sm font-medium">{formatTimestamp(user.updated_at)}</p>
              </div>
            )}
          </div>

          {user.roles && user.roles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {user.roles.map((r) => (
                <span
                  key={r}
                  className="bg-muted text-foreground rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
