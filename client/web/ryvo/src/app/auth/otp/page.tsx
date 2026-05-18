"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs";
import {
  getPasswordResetSession,
  setPasswordResetSession,
} from "@/lib/password-reset-session";
import { authPasswordService } from "@/services/auth-password.service";
import { otpSchema } from "@/types/interfaces/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow");
  const isReset = flow === "reset";
  const session = getPasswordResetSession();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (isReset && !session?.email) {
    return (
      <AuthFormShell title="Session expired" description="Start the reset flow again.">
        <RyvoButton intent="signIn" className="w-full" asChild>
          <Link href={ROUTES.auth.forgotPassword}>Forgot password</Link>
        </RyvoButton>
      </AuthFormShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = otpSchema.safeParse({ code });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid code");
      return;
    }
    if (!isReset || !session?.email) return;

    setLoading(true);
    try {
      const res = await authPasswordService.verifyOtp(session.email, parsed.data.code);
      setPasswordResetSession({ email: session.email, resetToken: res.reset_token });
      toast.success("Code verified");
      router.push(ROUTES.auth.resetPassword);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title="Enter verification code"
      description={`We sent a 6-digit code to ${session?.email ?? "your email"}.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="text-center text-2xl tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
        <RyvoButton intent="signIn" type="submit" className="w-full" disabled={loading || code.length < 6}>
          {loading ? "Verifying…" : "Verify code"}
        </RyvoButton>
        <p className="text-muted-foreground text-center text-sm">
          <Link href={ROUTES.auth.forgotPassword} className="text-primary font-medium hover:underline">
            Resend code
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense
      fallback={
        <AuthFormShell title="Loading…" description="">
          <p className="text-muted-foreground text-sm">Please wait…</p>
        </AuthFormShell>
      }
    >
      <OtpForm />
    </Suspense>
  );
}
