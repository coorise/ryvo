"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { ProfileHeader } from "@/components/admin/profile-header";
import { PERMISSIONS, PROFILE_VARIANT, QUERY_KEYS, ROUTES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { rbacService } from "@/services/rbac.service";

export default function StaffProfilePage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") ?? "";
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.userDetail(userId),
    queryFn: () => rbacService.getUserDetail(accessToken, userId),
    enabled:
      Boolean(accessToken) &&
      Boolean(userId) &&
      (hasPermission(PERMISSIONS.staff.read) || hasPermission(PERMISSIONS.roles.read)),
  });

  const user = data?.user;

  if (!userId) return <p className="text-muted-foreground text-sm">{t("common.noData")}</p>;
  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  if (!user) return <p className="text-muted-foreground text-sm">{t("common.noData")}</p>;

  return (
    <div className="space-y-6">
      <Link href={ROUTES.admin.staff.list} className="text-muted-foreground text-sm hover:underline">
        ← {t("nav.staff")}
      </Link>
      <ProfileHeader
        variant={PROFILE_VARIANT.staff}
        user={{
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          updated_at: user.updated_at,
          email_verified: user.email_verified,
          roles: user.roles,
        }}
      />
    </div>
  );
}
