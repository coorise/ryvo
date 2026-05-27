import { create } from "zustand";
import { persist } from "zustand/middleware";

import { STORAGE_KEYS } from "@/configs/const";
import type { SessionUser } from "@/types/interfaces/schemas";

type AuthSnapshot = {
  user: SessionUser | null;
  accessToken: string | null;
};

type AuthState = AuthSnapshot & {
  isHydrated: boolean;
  setAuth: (payload: AuthSnapshot) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isHydrated: false,
      setAuth: ({ user, accessToken }) => set({ user, accessToken }),
      clear: () => set({ user: null, accessToken: null }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: STORAGE_KEYS.auth,
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
