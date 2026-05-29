"use client";

import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Trip-scoped chat opens automatically when a ride is active (see live map / rides). */
export function PortalEphemeralChatPanel() {
  const { t } = useTranslation();

  return (
    <Card className="border-border/80 rounded-3xl">
      <CardHeader>
        <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-2xl">
          <MessageSquare className="size-6" />
        </div>
        <CardTitle>{t("portal.chat.title")}</CardTitle>
        <CardDescription>{t("portal.chat.description")}</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        <p>{t("portal.chat.empty")}</p>
      </CardContent>
    </Card>
  );
}
