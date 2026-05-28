import { BaseService } from "@/lib/base-service";

export class AuthPasswordService extends BaseService {
  constructor() {
    super("auth-hooks");
  }

  requestReset(email: string) {
    return this.post<{ sent: boolean; message: string; expires_minutes?: number }>(
      "/v1/auth/forgot-password",
      { email },
      null,
    );
  }

  verifyOtp(email: string, code: string) {
    return this.post<{ reset_token: string; expires_minutes: number }>(
      "/v1/auth/verify-reset-otp",
      { email, code },
      null,
    );
  }

  resetPassword(email: string, resetToken: string, password: string) {
    return this.post<{ message: string }>(
      "/v1/auth/reset-password",
      { email, reset_token: resetToken, password },
      null,
    );
  }
}

export const authPasswordService = new AuthPasswordService();
