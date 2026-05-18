"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs";
import { setPasswordResetSession } from "@/lib/password-reset-session";
import { authPasswordService } from "@/services/auth-password.service";
import { forgotPasswordSchema } from "@/types/interfaces/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid email");
      return;
    }
    setLoading(true);
    try {
      const res = await authPasswordService.requestReset(parsed.data.email);
      if (!res.sent) {
        toast.error(res.message);
        return;
      }
      setPasswordResetSession({ email: parsed.data.email });
      toast.success(res.message);
      router.push(`${ROUTES.auth.otp}?flow=reset`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell
      title="Forgot password?"
      description="Enter your email. We will send a 6-digit code to reset your password."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <RyvoButton intent="signIn" type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset code"}
        </RyvoButton>
        <p className="text-muted-foreground text-center text-sm">
          <Link href={ROUTES.auth.login} className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
}
