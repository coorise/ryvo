"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { ROUTES } from "@/configs";
import { authService } from "@/services";
import { useAuthStore } from "@/stores/auth.store";
import { registerSchema, type RegisterInput } from "@/types/interfaces/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState<RegisterInput>({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "client",
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid form");
      return;
    }
    setLoading(true);
    try {
      const session = await authService.signUp(parsed.data);
      if (session) setAuth(session);
      toast.success("Check your email to verify your account.");
      router.push(ROUTES.auth.verifyEmail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormShell title="Create account" description="Join Ryvo-Line as a rider or driver.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <RyvoButton
            type="button"
            intent={form.role === "client" ? "cta" : "outline"}
            className="flex-1"
            onClick={() => setForm((f) => ({ ...f, role: "client" }))}
          >
            Rider
          </RyvoButton>
          <RyvoButton
            type="button"
            intent={form.role === "driver" ? "cta" : "outline"}
            className="flex-1"
            onClick={() => setForm((f) => ({ ...f, role: "driver" }))}
          >
            Driver
          </RyvoButton>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
          />
        </div>
        <RyvoButton intent="cta" type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </RyvoButton>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link href={ROUTES.auth.login} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
}
