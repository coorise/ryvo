import type { ReactNode } from "react";

type PortalPageShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function PortalPageShell({ title, subtitle, children }: PortalPageShellProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
