"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { SettingsGeneralTab } from "@/components/admin/settings/settings-general-tab";
import { SettingsMailTab } from "@/components/admin/settings/settings-mail-tab";
import { SettingsNotificationsTab } from "@/components/admin/settings/settings-notifications-tab";
import { SettingsPaymentTab } from "@/components/admin/settings/settings-payment-tab";
import { SettingsProfileTab } from "@/components/admin/settings/settings-profile-tab";
import { ADMIN_QUERY, ADMIN_TABS } from "@/configs/const";
import { RouteGuard } from "@/guards/route-guard";
import { canViewSettingsTab } from "@/guards/abac";
import { useAuth } from "@/hooks/use-auth";
import { parseSettingsTab } from "@/lib/admin-settings-url";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function SettingsPageContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo(
    () => parseSettingsTab(searchParams.get(ADMIN_QUERY.tab)),
    [searchParams],
  );

  const visibleTabs = useMemo(() => {
    const keys = Object.values(ADMIN_TABS.settings);
    return keys.filter((key) =>
      canViewSettingsTab(user, key as keyof typeof ADMIN_TABS.settings),
    );
  }, [user]);

  const activeTab = visibleTabs.includes(tab as (typeof visibleTabs)[number])
    ? tab
    : (visibleTabs[0] ?? ADMIN_TABS.settings.profile);

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.tab, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settingsHub.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("settingsHub.subtitle")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {canViewSettingsTab(user, "profile") && (
            <TabsTrigger value={ADMIN_TABS.settings.profile}>
              {t("settingsHub.tabs.profile")}
            </TabsTrigger>
          )}
          {canViewSettingsTab(user, "general") && (
            <TabsTrigger value={ADMIN_TABS.settings.general}>
              {t("settingsHub.tabs.general")}
            </TabsTrigger>
          )}
          {canViewSettingsTab(user, "payment") && (
            <TabsTrigger value={ADMIN_TABS.settings.payment}>
              {t("settingsHub.tabs.payment")}
            </TabsTrigger>
          )}
          {canViewSettingsTab(user, "mail") && (
            <TabsTrigger value={ADMIN_TABS.settings.mail}>{t("settingsHub.tabs.mail")}</TabsTrigger>
          )}
          {canViewSettingsTab(user, "notifications") && (
            <TabsTrigger value={ADMIN_TABS.settings.notifications}>
              {t("settingsHub.tabs.notifications")}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={ADMIN_TABS.settings.profile} className="mt-6">
          <SettingsProfileTab />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.settings.general} className="mt-6">
          <SettingsGeneralTab />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.settings.payment} className="mt-6">
          <SettingsPaymentTab />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.settings.mail} className="mt-6">
          <SettingsMailTab />
        </TabsContent>
        <TabsContent value={ADMIN_TABS.settings.notifications} className="mt-6">
          <SettingsNotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();

  return (
    <RouteGuard dashboard="admin">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}
      >
        <SettingsPageContent />
      </Suspense>
    </RouteGuard>
  );
}
