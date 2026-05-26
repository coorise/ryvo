"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { ChatSupportPanel } from "@/components/admin/communication/chat-support-panel";
import { PermissionGate } from "@/guards/permission-gate";
import { ADMIN_QUERY, ADMIN_TABS } from "@/configs/const";

function ChatSupportPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => {
    const raw = searchParams.get(ADMIN_QUERY.sub);
    return raw === ADMIN_TABS.chatSupport.drivers
      ? ADMIN_TABS.chatSupport.drivers
      : ADMIN_TABS.chatSupport.clients;
  }, [searchParams]);

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.sub, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("nav.chatSupport")} subtitle={t("communication.chatSupport.subtitle")} />
      <ChatSupportPanel tab={tab} onTabChange={setTab} />
    </div>
  );
}

export default function CommunicationChatSupportPage() {
  const { t } = useTranslation();
  return (
    <PermissionGate permissions={["support:reply"]} fallback={<p>{t("common.noData")}</p>}>
      <Suspense fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}>
        <ChatSupportPageContent />
      </Suspense>
    </PermissionGate>
  );
}
