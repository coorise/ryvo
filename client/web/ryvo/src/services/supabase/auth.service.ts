import type { Session } from "@supabase/supabase-js";

import { mapSupabaseUserToSession } from "@/core/common/session-user";
import type { LoginInput, RegisterInput } from "@/types/interfaces/schemas";
import { createSupabaseBrowserClient } from "./client";

export type AuthSession = {
  accessToken: string;
  user: ReturnType<typeof mapSupabaseUserToSession>;
};

export class AuthService {
  private get client() {
    return createSupabaseBrowserClient();
  }

  async signIn({ email, password }: LoginInput) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return this.mapSession(data.session);
  }

  async signUp(input: RegisterInput) {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName, app_role: input.role },
      },
    });
    if (error) throw error;
    return this.mapSession(data.session);
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return this.mapSession(data.session);
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    return this.client.auth.onAuthStateChange((_event, session) => {
      callback(this.mapSession(session));
    });
  }

  getAccessToken() {
    return this.client.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
  }

  private mapSession(session: Session | null): AuthSession | null {
    if (!session?.user) return null;
    return {
      accessToken: session.access_token,
      user: mapSupabaseUserToSession(session.user, session.access_token),
    };
  }
}

let authServiceInstance: AuthService | null = null;

export function getAuthService() {
  if (!authServiceInstance) authServiceInstance = new AuthService();
  return authServiceInstance;
}

/** @deprecated prefer getAuthService() — kept for gradual migration */
export const authService = {
  signIn: (input: LoginInput) => getAuthService().signIn(input),
  signUp: (input: RegisterInput) => getAuthService().signUp(input),
  signOut: () => getAuthService().signOut(),
  getSession: () => getAuthService().getSession(),
  onAuthStateChange: (cb: (session: AuthSession | null) => void) =>
    getAuthService().onAuthStateChange(cb),
  getAccessToken: () => getAuthService().getAccessToken(),
};
