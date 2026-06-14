"use client";

import { useTranslation } from "react-i18next";
import { useState } from "react";

import { ActivityLogsPanel } from "@/components/admin/audit/activity-logs-panel";
import { SecurityTabs, SECURITY_TABS } from "@/components/admin/audit/security-tabs";
import { PortalAnalyticsPanel } from "@/components/portal/panels/portal-analytics-panel";
import { PortalRideWorkflowPanel } from "@/components/portal/panels/portal-ride-workflow-panel";
import { NotificationsInboxPanel } from "@/components/admin/communication/notifications-inbox-panel";
import { PortalChatSupportPanel } from "@/components/portal/panels/portal-chat-support-panel";
import { FeedbackTabAnalytics } from "@/components/admin/hr/feedback-tab-analytics";
import { LiveMapPanel } from "@/components/admin/map/live-map-panel";
import { SettingsProfileTab } from "@/components/admin/settings/settings-profile-tab";
import { PortalConfigurationsTabs } from "@/components/portal/portal-configurations-tabs";
import { PortalPageShell } from "@/components/portal/portal-page-shell";
import { PortalTabShell } from "@/components/portal/portal-tab-shell";
import { PortalPaymentsPanel } from "@/components/portal/panels/portal-payments-panel";
import { PortalRidesPanel } from "@/components/portal/panels/portal-rides-panel";
import { PortalCounterpartiesPanel } from "@/components/portal/panels/portal-counterparties-panel";
import { PortalDriverKycPanel } from "@/components/portal/panels/portal-driver-kyc-panel";
import { PortalEphemeralChatPanel } from "@/components/portal/panels/portal-ephemeral-chat-panel";
import { PortalMessagesPanel } from "@/components/portal/panels/portal-messages-panel";
import type { PortalArea } from "@/configs/portal-nav";

function usePortalTitle(key: string, subtitleKey?: string) {
  const { t } = useTranslation();
  return {
    title: t(key),
    subtitle: subtitleKey ? t(subtitleKey) : undefined,
  };
}

export function PortalNotificationsView() {
  const { title, subtitle } = usePortalTitle(
    "portal.nav.notifications",
    "communication.notifications.subtitle",
  );
  return (
    <PortalPageShell title={title} subtitle={subtitle}>
      <NotificationsInboxPanel />
    </PortalPageShell>
  );
}

export function PortalActivityLogsView() {
  const { title } = usePortalTitle("portal.nav.activityLogs");
  return (
    <PortalPageShell title={title}>
      <ActivityLogsPanel variant="portal" />
    </PortalPageShell>
  );
}

export function PortalSecurityLogsView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>(SECURITY_TABS.auth);
  return (
    <PortalPageShell title={t("portal.nav.securityLogs")}>
      <SecurityTabs tab={tab} onTabChange={setTab} variant="portal" />
    </PortalPageShell>
  );
}

export function PortalAnalyticsView({ area }: { area: PortalArea }) {
  const { title } = usePortalTitle("portal.nav.analytics");
  return (
    <PortalPageShell title={title}>
      <PortalAnalyticsPanel area={area} />
    </PortalPageShell>
  );
}

export function PortalPaymentsView() {
  const { title, subtitle } = usePortalTitle("portal.nav.payments", "portal.payments.subtitle");
  return (
    <PortalPageShell title={title} subtitle={subtitle}>
      <PortalPaymentsPanel />
    </PortalPageShell>
  );
}

export function PortalRidesView({ area }: { area: PortalArea }) {
  const { title, subtitle } = usePortalTitle("portal.nav.rides", "portal.rides.subtitle");
  return (
    <PortalPageShell title={title} subtitle={subtitle}>
      <PortalRidesPanel area={area} />
    </PortalPageShell>
  );
}

export function PortalFeedbacksView({ area }: { area: PortalArea }) {
  const { title } = usePortalTitle("portal.nav.feedbacks");
  const category = area === "driver" ? "driver" : "product";
  return (
    <PortalPageShell title={title}>
      <FeedbackTabAnalytics
        category={category}
        descKey={area === "driver" ? "hr.feedbacks.driversDesc" : "hr.feedbacks.productDesc"}
      />
    </PortalPageShell>
  );
}

export function PortalChatSupportView() {
  const { title } = usePortalTitle("portal.nav.chatSupport");
  return (
    <PortalPageShell title={title}>
      <PortalChatSupportPanel />
    </PortalPageShell>
  );
}

export function PortalChatView() {
  const { title, subtitle } = usePortalTitle("portal.nav.chat", "portal.chat.subtitle");
  return (
    <PortalPageShell title={title} subtitle={subtitle}>
      <PortalEphemeralChatPanel />
    </PortalPageShell>
  );
}

export function PortalMessagesView() {
  const { title, subtitle } = usePortalTitle("portal.nav.messages", "portal.messages.subtitle");
  return (
    <PortalPageShell title={title} subtitle={subtitle}>
      <PortalMessagesPanel audience="drivers" />
    </PortalPageShell>
  );
}

export function PortalProfileSettingsView() {
  const { title } = usePortalTitle("portal.nav.profile");
  return (
    <PortalPageShell title={title}>
      <SettingsProfileTab />
    </PortalPageShell>
  );
}

export function PortalConfigurationsView({ area }: { area: PortalArea }) {
  const { title } = usePortalTitle("portal.nav.configurations");
  return (
    <PortalPageShell title={title}>
      <PortalConfigurationsTabs area={area} />
    </PortalPageShell>
  );
}

export function PortalDriverKycView() {
  const { title, subtitle } = usePortalTitle("portal.nav.driverKyc", "portal.kyc.subtitle");
  return (
    <PortalPageShell title={title} subtitle={subtitle}>
      <PortalDriverKycPanel />
    </PortalPageShell>
  );
}

export function PortalCounterpartiesView({ area }: { area: PortalArea }) {
  const titleKey = area === "driver" ? "portal.nav.clients" : "portal.nav.drivers";
  const subtitleKey = area === "driver" ? "portal.clients.subtitle" : "portal.drivers.subtitle";
  const { title, subtitle } = usePortalTitle(titleKey, subtitleKey);
  return (
    <PortalPageShell title={title} subtitle={subtitle}>
      <PortalCounterpartiesPanel area={area} />
    </PortalPageShell>
  );
}

export function PortalLiveMapView({ area }: { area: PortalArea }) {
  const { t } = useTranslation();
  if (area === "driver") {
    return (
      <PortalPageShell title={t("portal.nav.liveMap")} subtitle={t("portal.liveMap.driverSubtitle")}>
        <PortalTabShell
          defaultTab="live"
          tabs={[
            {
              id: "live",
              label: t("portal.liveMap.tabs.live"),
              content: (
                <>
                  <LiveMapPanel apiScope="portal" />
                  <div className="mt-4">
                    <PortalRideWorkflowPanel area="driver" mode="booking" />
                  </div>
                </>
              ),
            },
            {
              id: "incoming",
              label: t("portal.liveMap.tabs.incoming"),
              content: <PortalRideWorkflowPanel area="driver" mode="incoming" />,
            },
            {
              id: "driving",
              label: t("portal.liveMap.tabs.driving"),
              content: <PortalRideWorkflowPanel area="driver" mode="driving" />,
            },
          ]}
        />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell title={t("portal.nav.liveMap")} subtitle={t("portal.liveMap.clientSubtitle")}>
      <PortalTabShell
        defaultTab="go"
        tabs={[
          {
            id: "go",
            label: t("portal.liveMap.tabs.goTo"),
            content: (
              <>
                <LiveMapPanel apiScope="portal" />
                <div className="mt-4">
                  <PortalRideWorkflowPanel area="client" mode="booking" />
                </div>
              </>
            ),
          },
          {
            id: "requesting",
            label: t("portal.liveMap.tabs.requesting"),
            content: <PortalRideWorkflowPanel area="client" mode="requesting" />,
          },
          {
            id: "driving",
            label: t("portal.liveMap.tabs.driving"),
            content: <PortalRideWorkflowPanel area="client" mode="driving" />,
          },
        ]}
      />
    </PortalPageShell>
  );
}
