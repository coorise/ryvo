"use client";

import { useEffect } from "react";

import { authService } from "@/services";
import { useAuthStore } from "@/stores/auth.store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    let mounted = true;
    authService.getSession().then((session) => {
      if (!mounted) return;
      if (session) setAuth(session);
    });
    const { data } = authService.onAuthStateChange((payload) => {
      if (payload) setAuth(payload);
      else clear();
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [setAuth, clear]);

  return {
    user,
    accessToken,
    isReady: isHydrated,
    signOut: () => authService.signOut().then(() => clear()),
  };
}
