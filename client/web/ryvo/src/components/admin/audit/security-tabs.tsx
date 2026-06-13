"use client";

import { useTranslation } from "react-i18next";

import { SecurityAuthLogsPanel } from "@/components/admin/audit/security-auth-logs-panel";
import { SecurityDevicesPanel } from "@/components/admin/audit/security-devices-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SECURITY_TABS = {
  auth: "auth",
  devices: "devices",
} as const;

type SecurityTabsProps = {
  tab: string;
  onTabChange: (v: string) => void;
  variant?: "admin" | "portal";
};

export function SecurityTabs({ tab, onTabChange, variant = "admin" }: SecurityTabsProps) {
  const { t } = useTranslation();

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value={SECURITY_TABS.auth}>{t("security.tabs.authLogs")}</TabsTrigger>
        <TabsTrigger value={SECURITY_TABS.devices}>{t("security.tabs.devicesLogs")}</TabsTrigger>
      </TabsList>
      <TabsContent value={SECURITY_TABS.auth} className="mt-6">
        <SecurityAuthLogsPanel variant={variant} />
      </TabsContent>
      <TabsContent value={SECURITY_TABS.devices} className="mt-6">
        <SecurityDevicesPanel variant={variant} />
      </TabsContent>
    </Tabs>
  );
}
