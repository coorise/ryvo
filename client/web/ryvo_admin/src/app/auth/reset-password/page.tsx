"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs";
import {
  clearPasswordResetSession,
  getPasswordResetSession,
} from "@/lib/password-reset-session";
import { authPasswordService } from "@/services/auth-password.service";
import { resetPasswordSchema } from "@/types/interfaces/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const resetSession = getPasswordResetSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!resetSession?.email || !resetSession.resetToken) {
    return (
      <AuthFormShell title="Session expired" description="Verify your code first.">
        <RyvoButton intent="signIn" className="w-full" asChild>
          <Link href={ROUTES.auth.forgotPassword}>Start over</Link>
        </RyvoButton>
      </AuthFormShell>
    );
  }

  const { email, resetToken } = resetSession;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid password");
      return;
    }
    setLoading(true);
    try {
      const res = await authPasswordService.resetPassword(email, resetToken, parsed.data.password);
      clearPasswordResetSession();
      toast.success(res.message);
      router.push(ROUTES.auth.login);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell title="New password" description="Choose a strong password for your account.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <RyvoButton intent="cta" type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Update password"}
        </RyvoButton>
      </form>
    </AuthFormShell>
  );
}
