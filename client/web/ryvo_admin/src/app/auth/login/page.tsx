"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs";
import { dashboardPathForUser } from "@/guards/abac";
import { enrichSessionUser } from "@/guards/enrich-session-user";
import { authService } from "@/services";
import { useAuthStore } from "@/stores/auth.store";
import { loginSchema, type LoginInput } from "@/types/interfaces/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid form");
      return;
    }
    setLoading(true);
    try {
      const session = await authService.signIn(parsed.data);
      if (!session) {
        toast.error("No session returned");
        return;
      }
      const enrichedUser = await enrichSessionUser(session.user, session.accessToken);
      setAuth({ ...session, user: enrichedUser });
      if (!enrichedUser.emailVerified) {
        router.push(ROUTES.auth.verifyEmail);
        return;
      }
      router.push(dashboardPathForUser(enrichedUser));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      toast.error(
        msg.includes("API key") || msg.includes("anon")
          ? "Auth not configured — set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example)"
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell title="Welcome back" description="Sign in to continue with Ryvo-Line.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href={ROUTES.auth.forgotPassword}
              className="text-primary text-xs font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>
        <RyvoButton intent="signIn" type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </RyvoButton>
        <p className="text-muted-foreground text-center text-sm">
          No account?{" "}
          <Link href={ROUTES.auth.register} className="text-primary font-medium hover:underline">
            Register
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
}
