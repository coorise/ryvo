"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-list-ui";
import { ChatSupportPanel } from "@/components/admin/communication/chat-support-panel";
import { CreateSupportTicketDialog } from "@/components/admin/communication/create-support-ticket-dialog";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { PermissionGate } from "@/guards/permission-gate";
import { ADMIN_QUERY, ADMIN_TABS, PERMISSIONS } from "@/configs/const";
import { cn } from "@/lib/utils";

function ChatSupportPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileInThread, setMobileInThread] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [focusTicketId, setFocusTicketId] = useState<string | null>(null);

  const tab = useMemo(() => {
    const raw = searchParams.get(ADMIN_QUERY.sub);
    return raw === ADMIN_TABS.chatSupport.drivers
      ? ADMIN_TABS.chatSupport.drivers
      : ADMIN_TABS.chatSupport.clients;
  }, [searchParams]);

  const audience = tab === ADMIN_TABS.chatSupport.drivers ? "drivers" : "clients";

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ADMIN_QUERY.sub, value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        mobileInThread && "h-full min-h-[calc(100dvh-4rem)]",
      )}
    >
      {!mobileInThread && (
        <AdminPageHeader
          title={t("nav.chatSupport")}
          subtitle={t("communication.chatSupport.subtitle")}
          action={
            <RyvoButton intent="cta" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {t("communication.chatSupport.createTicket")}
            </RyvoButton>
          }
        />
      )}

      <CreateSupportTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        audience={audience}
        onCreated={(id) => setFocusTicketId(id)}
      />

      <ChatSupportPanel
        tab={tab}
        onTabChange={setTab}
        onMobileThreadChange={setMobileInThread}
        focusTicketId={focusTicketId}
      />
    </div>
  );
}

export default function CommunicationChatSupportPage() {
  const { t } = useTranslation();
  return (
    <PermissionGate
      permissions={[PERMISSIONS.communication.chatReply, PERMISSIONS.support.reply]}
      fallback={<p>{t("common.noData")}</p>}
    >
      <Suspense fallback={<p className="text-muted-foreground text-sm">{t("common.loading")}</p>}>
        <ChatSupportPageContent />
      </Suspense>
    </PermissionGate>
  );
}
