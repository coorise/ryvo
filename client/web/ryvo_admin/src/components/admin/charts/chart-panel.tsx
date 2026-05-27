"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChartPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
};

export function ChartPanel({ title, description, children, className, actions }: ChartPanelProps) {
  return (
    <div className={cn("border-border bg-card rounded-2xl border p-4 shadow-sm", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="min-h-[220px] w-full">{children}</div>
    </div>
  );
}
