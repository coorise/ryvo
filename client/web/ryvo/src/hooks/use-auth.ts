"use client";

import { useEffect, useState } from "react";

import { isInternalPortalUser } from "@/guards/internal-user";
import { enrichSessionUser } from "@/guards/enrich-session-user";
import { clearLegacySharedAuthCookies } from "@/lib/clear-legacy-auth-cookies";
import { authService } from "@/services";
import { useAuthStore } from "@/stores/auth.store";

async function normalizePortalSession(
  session: { user: Parameters<typeof enrichSessionUser>[0]; accessToken: string } | null,
) {
  if (!session) return null;
  const user = await enrichSessionUser(session.user, session.accessToken);
  if (isInternalPortalUser(user)) return null;
  return { ...session, user };
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clear = useAuthStore((s) => s.clear);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    clearLegacySharedAuthCookies();
    let mounted = true;
    authService.getSession().then(async (session) => {
      if (!mounted) return;
      const portalSession = await normalizePortalSession(session);
      if (portalSession) setAuth(portalSession);
      else clear();
      setSessionChecked(true);
    });
    const { data } = authService.onAuthStateChange(async (payload) => {
      if (!payload) {
        clear();
        return;
      }
      const portalSession = await normalizePortalSession(payload);
      if (portalSession) setAuth(portalSession);
      else {
        await authService.signOut();
        clear();
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [setAuth, clear]);

  return {
    user,
    accessToken,
    isReady: isHydrated && sessionChecked,
    signOut: () => authService.signOut().then(() => clear()),
  };
}
