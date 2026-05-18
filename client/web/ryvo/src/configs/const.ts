export const APP_NAME = "Ryvo-Line";
export const APP_TAGLINE = "Ride smarter";
export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "zh", "de"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const STORAGE_KEYS = {
  auth: "ryvo.auth.v1",
  theme: "ryvo.theme",
  language: "ryvo.lang",
} as const;

export const ROUTES = {
  landing: "/landing",
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    verifyEmail: "/auth/verify-email",
    forgotPassword: "/auth/forgot-password",
    otp: "/auth/otp",
    resetPassword: "/auth/reset-password",
  },
  client: { home: "/client" },
  driver: { home: "/driver" },
  admin: { home: "/admin" },
  legal: { tos: "/legal/tos", privacy: "/legal/privacy" },
} as const;

export const ROLES = [
  "super_admin",
  "admin",
  "staff",
  "moderator",
  "driver",
  "client",
] as const;

export type AppRole = (typeof ROLES)[number];

/** Semantic button intents — map to Tailwind / shadcn variants */
export const BUTTON_INTENT = {
  cta: "default",
  signIn: "info",
  danger: "destructive",
  warning: "warning",
  ghost: "ghost",
  outline: "outline",
} as const;

export const DASHBOARD_NAV = {
  client: [
    { href: "/client", label: "Home" },
    { href: "/client/rides", label: "Rides" },
    { href: "/client/profile", label: "Profile" },
  ],
  driver: [
    { href: "/driver", label: "Home" },
    { href: "/driver/earnings", label: "Earnings" },
    { href: "/driver/documents", label: "KYC" },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", roles: ["admin", "super_admin", "staff", "moderator"] },
    { href: "/admin/map", label: "Live map", badge: "Live", roles: ["admin", "super_admin", "staff", "moderator"] },
    { href: "/admin/rides", label: "Rides", badge: "4", permissions: ["rides:read"] },
    { href: "/admin/users", label: "Users", roles: ["admin", "super_admin", "staff"] },
    { href: "/admin/drivers", label: "Driver KYC", badge: "4", permissions: ["kyc:review"] },
    { href: "/admin/tickets", label: "Support", badge: "3", roles: ["admin", "super_admin", "staff", "moderator"] },
    { href: "/admin/payments", label: "Payments", permissions: ["audit:read"] },
    { href: "/admin/security", label: "Security logs", permissions: ["audit:read"] },
    { href: "/admin/audit", label: "Audit logs", permissions: ["audit:read"] },
    { href: "/admin/settings", label: "Settings", roles: ["admin", "super_admin"] },
  ],
} as const;

export const STORAGE_KEYS_RESET = "ryvo.password-reset.v1" as const;
