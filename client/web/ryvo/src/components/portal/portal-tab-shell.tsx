"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PortalTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type PortalTabShellProps = {
  tabs: PortalTab[];
  defaultTab?: string;
};

export function PortalTabShell({ tabs, defaultTab }: PortalTabShellProps) {
  const initial = defaultTab ?? tabs[0]?.id;
  return (
    <Tabs defaultValue={initial} className="space-y-4">
      <TabsList className="flex h-auto flex-wrap gap-1">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
