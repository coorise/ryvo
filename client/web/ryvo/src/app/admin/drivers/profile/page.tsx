"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { DriverDocumentsSection } from "@/components/admin/driver-documents-section";
import { ProfileHeader } from "@/components/admin/profile-header";
import { ReviewsSection } from "@/components/admin/reviews-section";
import { PERMISSIONS, PROFILE_VARIANT, QUERY_KEYS, ROUTES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { driversService } from "@/services/drivers.service";

export default function DriverProfilePage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const driverId = searchParams.get("id") ?? "";
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.driverDetail(driverId),
    queryFn: () => driversService.getDriver(accessToken, driverId),
    enabled: Boolean(accessToken) && Boolean(driverId) && hasPermission(PERMISSIONS.drivers.read),
  });

  const driver = data?.driver;

  if (!driverId) return <p className="text-muted-foreground text-sm">{t("common.noData")}</p>;
  if (isLoading) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;
  if (!driver) return <p className="text-muted-foreground text-sm">{t("common.noData")}</p>;

  return (
    <div className="space-y-6">
      <Link href={ROUTES.admin.drivers.list} className="text-muted-foreground text-sm hover:underline">
        ← {t("nav.driverKyc")}
      </Link>
      <ProfileHeader
        variant={PROFILE_VARIANT.driver}
        user={{
          full_name: driver.full_name,
          email: driver.email,
          phone: driver.phone,
          avatar_url: driver.avatar_url,
          rating_avg: driver.rating_avg,
          trip_count: driver.trip_count,
          created_at: driver.created_at,
          updated_at: driver.updated_at,
          email_verified: driver.email_verified,
          profile_verified: driver.profile_verified,
          kyc_status: driver.kyc_status,
          roles: driver.roles,
        }}
      />
      <DriverDocumentsSection driverId={driver.id} documents={driver.documents} />
      <ReviewsSection reviews={driver.reviews} />
    </div>
  );
}
