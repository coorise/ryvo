"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AdminDriverVehiclesSection } from "@/components/admin/admin-driver-vehicles-section";
import { DriverDocumentsSection } from "@/components/admin/driver-documents-section";
import { ProfileManageSection } from "@/components/admin/profile-manage-section";
import { ProfileHeader } from "@/components/admin/profile-header";
import { ReviewsSection } from "@/components/admin/reviews-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS, PROFILE_VARIANT, QUERY_KEYS, ROUTES } from "@/configs/const";
import { useAuth } from "@/hooks/use-auth";
import { useRbac } from "@/hooks/use-rbac";
import { driversService } from "@/services/drivers.service";
import { rbacService } from "@/services/rbac.service";

const TAB_DRIVER = "driver";
const TAB_CARS = "cars";

export default function DriverProfilePage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const driverId = searchParams.get("id") ?? "";
  const tabParam = searchParams.get("tab");
  const tab = tabParam === TAB_CARS ? TAB_CARS : TAB_DRIVER;
  const { accessToken } = useAuth();
  const { hasPermission } = useRbac();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.admin.driverDetail(driverId),
    queryFn: () => driversService.getDriver(accessToken, driverId),
    enabled: Boolean(accessToken) && Boolean(driverId) && hasPermission(PERMISSIONS.drivers.read),
  });

  const { data: userDetail } = useQuery({
    queryKey: QUERY_KEYS.admin.userDetail(driverId),
    queryFn: () => rbacService.getUserDetail(accessToken, driverId),
    enabled: Boolean(accessToken) && Boolean(driverId) && hasPermission(PERMISSIONS.drivers.read),
  });

  const driver = data?.driver;
  const canEditDriver =
    hasPermission(PERMISSIONS.drivers.update) || hasPermission(PERMISSIONS.users.update);

  function setTab(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${ROUTES.admin.drivers.profile}?${params.toString()}`, { scroll: false });
  }

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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value={TAB_DRIVER}>{t("drivers.tabs.driver")}</TabsTrigger>
          <TabsTrigger value={TAB_CARS}>
            {t("drivers.tabs.cars")}
            {(driver.vehicles?.length ?? 0) > 0 ? (
              <span className="bg-muted ml-2 rounded-full px-2 py-0.5 text-[10px]">
                {driver.vehicles!.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={TAB_DRIVER} className="mt-6 space-y-6">
          {userDetail?.user ? (
            <ProfileManageSection
              userId={driverId}
              canEdit={canEditDriver}
              invalidateDriverDetail
              initial={{
                full_name: userDetail.user.full_name,
                email: userDetail.user.email,
                phone: userDetail.user.phone,
                username: userDetail.user.username,
                custom_fields: userDetail.user.custom_fields ?? {},
              }}
            />
          ) : null}
          <DriverDocumentsSection driverId={driver.id} documents={driver.documents} />
          <ReviewsSection reviews={driver.reviews} />
        </TabsContent>

        <TabsContent value={TAB_CARS} className="mt-6">
          <AdminDriverVehiclesSection driverId={driver.id} vehicles={driver.vehicles ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
