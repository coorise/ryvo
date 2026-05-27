"use client";

import type { ReactNode } from "react";

import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { cn } from "@/lib/utils";

type SettingsFormCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
};

export function SettingsFormCard({
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Save",
  pending,
  disabled,
  className,
}: SettingsFormCardProps) {
  return (
    <form
      className={cn("border-border bg-card space-y-4 rounded-3xl border p-6", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
      {onSubmit && (
        <RyvoButton intent="cta" type="submit" className="w-full sm:w-auto" disabled={pending || disabled}>
          {submitLabel}
        </RyvoButton>
      )}
    </form>
  );
}
