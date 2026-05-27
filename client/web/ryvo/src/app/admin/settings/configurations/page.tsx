"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { SettingsGeneralTab } from "@/components/admin/settings/settings-general-tab";
import { SettingsMailTab } from "@/components/admin/settings/settings-mail-tab";
import { SettingsNotificationsTab } from "@/components/admin/settings/settings-notifications-tab";
import { SettingsPaymentTab } from "@/components/admin/settings/settings-payment-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_QUERY, ADMIN_TABS, PERMISSIONS } from "@/configs/const";
import { canViewSettingsTab } from "@/guards/abac";
import { PermissionGate } from "@/guards/permission-gate";
import { useAuth } from "@/hooks/use-auth";

const CONFIG_TAB_VALUES = [
  ADMIN_TABS.settings.general,
  ADMIN_TABS.settings.payment,
  ADMIN_TABS.settings.mail,
  ADMIN_TABS.settings.notifications,
] as const;

function parseConfigTab(raw: string | null): string {
  if (raw && (CONFIG_TAB_VALUES as readonly string[]).includes(raw)) return raw;
  return ADMIN_TABS.settings.general;
}

function SettingsConfigurationsPageContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo(() => parseConfigTab(searchParams.get(ADMIN_QUERY.tab)), [searchParams]);

  const visibleTabs = useMemo(() => {
    const keys = [...CONFIG_TAB_VALUES];
    return keys.filter((key) =>
      canViewSettingsTab(user, key as keyof typeof ADMIN_TABS.settings),
    );
  }, [user]);

  const activeTab = visibleTabs.includes(tab as (typeof visibleTabs)[number])
    ? tab
    : (visibleTabs[0] ?? ADMIN_TABS.settings.general);

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
      <AdminPageHeader title={t("nav.configurations")} subtitle={t("settingsHub.subtitle")} />

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {canViewSettingsTab(user, "general") && (
            <TabsTrigger value={ADMIN_TABS.settings.general}>{t("settingsHub.tabs.general")}</TabsTrigger>
          )}
          {canViewSettingsTab(user, "payment") && (
            <TabsTrigger value={ADMIN_TABS.settings.payment}>{t("settingsHub.tabs.payment")}</TabsTrigger>
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

/** Settings → Configurations (tabs without Profile) */
export default function AdminSettingsConfigurationsPage() {
  const { t } = useTranslation();

  return (
    <PermissionGate permissions={[PERMISSIONS.settings.read]} fallback={<p>{t("common.noData")}</p>}>
      <Suspense fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}>
        <SettingsConfigurationsPageContent />
      </Suspense>
    </PermissionGate>
  );
}

