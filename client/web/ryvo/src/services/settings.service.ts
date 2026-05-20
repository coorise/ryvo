import { BaseService } from "@/lib/base-service";
import type { PlatformPreferences } from "@/types/interfaces/schemas/platform.schema";

export type SelfProfile = {
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  locale: string | null;
  bio: string | null;
  roles: string[];
};

export type EmailTemplate = {
  template_key: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  updated_at?: string;
};

export type PaymentSettingsConfig = {
  currency: string;
  stripeMode: "test" | "live";
  stripePublishableKey?: string;
  platformFeePercent: number;
  driverPayoutDelayDays: number;
  minTripFare: number;
  cancellationFee: number;
  autoCapture: boolean;
  tipsEnabled: boolean;
  requirePreauth: boolean;
};

export type NotificationEventRule = {
  key: string;
  enabled: boolean;
  channels: { push: boolean; email: boolean; sms: boolean };
  audiences: { client: boolean; driver: boolean; staff: boolean };
};

export class SettingsService extends BaseService {
  constructor() {
    super("auth-hooks");
  }

  getMyProfile(token: string | null) {
    return this.get<{ profile: SelfProfile }>("/v1/me/profile", token);
  }

  updateMyProfile(token: string | null, body: Partial<SelfProfile>) {
    return this.patch<{ profile: SelfProfile }>("/v1/me/profile", body, token);
  }

  getGeneral(token: string | null) {
    return this.get<{ preferences: PlatformPreferences }>("/v1/admin/settings", token);
  }

  updateGeneral(token: string | null, preferences: Partial<PlatformPreferences>) {
    return this.patch<{ preferences: PlatformPreferences }>(
      "/v1/admin/settings",
      preferences,
      token,
    );
  }

  getPayment(token: string | null) {
    return this.get<{ config: PaymentSettingsConfig }>("/v1/admin/settings/payment", token);
  }

  updatePayment(token: string | null, config: Partial<PaymentSettingsConfig>) {
    return this.patch<{ config: PaymentSettingsConfig }>(
      "/v1/admin/settings/payment",
      config,
      token,
    );
  }

  listEmailTemplates(token: string | null) {
    return this.get<{ templates: EmailTemplate[] }>("/v1/admin/email-templates", token);
  }

  updateEmailTemplate(
    token: string | null,
    templateKey: string,
    body: Pick<EmailTemplate, "subject" | "body_html" | "body_text">,
  ) {
    return this.put<{ template: EmailTemplate }>(
      `/v1/admin/email-templates/${templateKey}`,
      body,
      token,
    );
  }

  getNotifications(token: string | null) {
    return this.get<{ config: { events: NotificationEventRule[] } }>(
      "/v1/admin/settings/notifications",
      token,
    );
  }

  updateNotifications(token: string | null, events: NotificationEventRule[]) {
    return this.patch<{ config: { events: NotificationEventRule[] } }>(
      "/v1/admin/settings/notifications",
      { events },
      token,
    );
  }
}

export const settingsService = new SettingsService();
