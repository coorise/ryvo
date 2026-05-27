import type { ReactNode } from "react";

import { BrandLogo } from "@/components/ryvo/brand-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthFormShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthFormShell({ title, description, children }: AuthFormShellProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-4">
      <div className="mb-8">
        <BrandLogo />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
