"use client";

import Link from "next/link";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs";
import { useAuth } from "@/hooks/use-auth";

export default function VerifyEmailPage() {
  const { user } = useAuth();

  return (
    <AuthFormShell
      title="Verify your email"
      description="We sent a confirmation link. Open it to unlock booking and driving."
    >
      <div className="space-y-4">
        {user?.email && (
          <p className="text-muted-foreground text-sm">
            Sent to <span className="text-foreground font-medium">{user.email}</span>
          </p>
        )}
        <RyvoButton intent="signIn" className="w-full" asChild>
          <Link href={ROUTES.auth.login}>Back to sign in</Link>
        </RyvoButton>
      </div>
    </AuthFormShell>
  );
}
