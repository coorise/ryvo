"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { StaffPermissionsTab } from "@/components/admin/staff-permissions-tab";
import { StaffRolesTab } from "@/components/admin/staff-roles-tab";
import { StaffStaffsTab } from "@/components/admin/staff-staffs-tab";
import { RouteGuard } from "@/guards/route-guard";
import { ADMIN_QUERY, ADMIN_TABS } from "@/configs/const";
import { parseStaffTab } from "@/lib/admin-staff-url";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StaffPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo(
    () => parseStaffTab(searchParams.get(ADMIN_QUERY.tab)),
    [searchParams],
  );

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.tab, value);
      if (value !== ADMIN_TABS.staff.permissions) {
        params.delete(ADMIN_QUERY.role);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.staff")}</h1>
        <p className="text-muted-foreground text-sm">{t("staff.subtitle")}</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value={ADMIN_TABS.staff.staffs}>{t("staff.tabStaffs")}</TabsTrigger>
          <TabsTrigger value={ADMIN_TABS.staff.roles}>{t("staff.tabRoles")}</TabsTrigger>
          <TabsTrigger value={ADMIN_TABS.staff.permissions}>{t("staff.tabPermissions")}</TabsTrigger>
        </TabsList>
        <TabsContent value={ADMIN_TABS.staff.staffs} className="mt-6">
          <StaffStaffsTab />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.staff.roles} className="mt-6">
          <StaffRolesTab />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.staff.permissions} className="mt-6">
          <StaffPermissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminStaffPage() {
  const { t } = useTranslation();

  return (
    <RouteGuard permissions={["staff:read", "roles:read"]}>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}
      >
        <StaffPageContent />
      </Suspense>
    </RouteGuard>
  );
}
