export const APP_NAME = "Ryvo-Line";
export const APP_TAGLINE = "Ride smarter";
export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "zh", "de"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const STORAGE_KEYS = {
  auth: "ryvo.auth.v1",
  theme: "ryvo.theme",
  language: "ryvo.lang",
} as const;

export const STORAGE_KEYS_RESET = "ryvo.password-reset.v1" as const;

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
  admin: {
    home: "/admin",
    map: "/admin/map",
    rides: "/admin/rides",
    users: {
      list: "/admin/users",
      new: "/admin/users/new",
      profile: "/admin/users/profile",
    },
    staff: {
      list: "/admin/staff",
      new: "/admin/staff/new",
      assign: "/admin/staff/assign",
      profile: "/admin/staff/profile",
      roles: {
        new: "/admin/staff/roles/new",
        profile: "/admin/staff/roles/profile",
      },
    },
    drivers: {
      list: "/admin/drivers",
      new: "/admin/drivers/new",
      profile: "/admin/drivers/profile",
    },
    tickets: "/admin/tickets",
    payments: "/admin/payments",
    security: "/admin/security",
    audit: "/admin/audit",
    settings: "/admin/settings",
    observability: "/admin/observability",
    finance: {
      referrals: "/admin/finance/referrals",
      tariffs: "/admin/finance/tariffs",
      checkouts: "/admin/finance/checkouts",
      paychecks: "/admin/finance/paychecks",
      speculative: "/admin/finance/speculative",
    },
    analytics: "/admin/analytics",
  },
  legal: { tos: "/legal/tos", privacy: "/legal/privacy" },
} as const;

/** @deprecated Use ROUTES.admin — kept for gradual migration */
export const ADMIN_HOME = ROUTES.admin.home;

export const ROLES = [
  "super_admin",
  "admin",
  "staff",
  "moderator",
  "agent",
  "support",
  "driver",
  "client",
] as const;

export type AppRole = (typeof ROLES)[number];

export const SYSTEM_ROLE_NAMES = ["super_admin", "client", "driver"] as const;

export const BUTTON_INTENT = {
  cta: "default",
  signIn: "info",
  danger: "destructive",
  warning: "warning",
  ghost: "ghost",
  outline: "outline",
} as const;

export const ADMIN_TABS = {
  staff: {
    staffs: "staffs",
    roles: "roles",
    permissions: "permissions",
  },
  speculative: {
    revenues: "revenues",
    opex: "opex",
  },
  referrals: {
    bonus: "bonus",
    referrals: "referrals",
    settings: "settings",
  },
  referralsBonus: {
    clients: "clients",
    drivers: "drivers",
  },
  referralsPrograms: {
    loyalty: "loyalty",
    clientReferrals: "client-referrals",
    driverReferrals: "driver-referrals",
  },
  settings: {
    profile: "profile",
    general: "general",
    payment: "payment",
    mail: "mail",
    notifications: "notifications",
  },
} as const;

export const ADMIN_QUERY = {
  tab: "tab",
  role: "role",
  sub: "sub",
} as const;

export const LIST_LAYOUT = {
  table: "table",
  grid: "grid",
} as const;

export type ListLayout = (typeof LIST_LAYOUT)[keyof typeof LIST_LAYOUT];

export const LIST_LOAD_MODE = {
  infinite: "infinite",
  pages: "pages",
} as const;

export type ListLoadMode = (typeof LIST_LOAD_MODE)[keyof typeof LIST_LOAD_MODE];

export const LIST_DEFAULT_PAGE_SIZE = 30;

export const DELETE_MODE = {
  soft: "soft",
  permanent: "permanent",
} as const;

export type DeleteMode = (typeof DELETE_MODE)[keyof typeof DELETE_MODE];

/** Grace period before delete executes (toast undo window). */
export const DELETE_GRACE_MS = 10_000;

export const DELETE_CONFIRM_TEXT = "DELETE";

export const LIST_PAGE_SIZE = {
  min: 5,
  max: 100,
  default: LIST_DEFAULT_PAGE_SIZE,
} as const;

export const SORT_KEYS = {
  name: "name",
  email: "email",
  updatedAt: "updated_at",
  roleName: "name",
  permissionsCount: "permissions_count",
} as const;

export const ADMIN_USER_KIND = {
  clients: "clients",
  drivers: "drivers",
  staff: "staff",
  all: "all",
} as const;

export type AdminUserKind = (typeof ADMIN_USER_KIND)[keyof typeof ADMIN_USER_KIND];

export const QUERY_KEYS = {
  admin: {
    users: (kind: string) => ["admin", "users", kind] as const,
    userDetail: (id: string) => ["admin", "user", id] as const,
    staff: ["admin", "users", ADMIN_USER_KIND.staff] as const,
    drivers: ["admin", "drivers"] as const,
    driverDetail: (id: string) => ["admin", "driver", id] as const,
    rbacMatrix: ["rbac", "matrix"] as const,
    rbacMe: ["rbac", "me"] as const,
    dashboard: ["admin", "dashboard"] as const,
  },
} as const;

export const PERMISSIONS = {
  users: {
    read: "users:read",
    create: "users:create",
    update: "users:update",
    delete: "users:delete",
    ban: "users:ban",
  },
  drivers: {
    read: "drivers:read",
    create: "drivers:create",
    update: "drivers:update",
    delete: "drivers:delete",
    kycRead: "drivers:kyc:read",
    kycVerify: "drivers:kyc:verify",
    kycUpdate: "drivers:kyc:update",
  },
  staff: {
    read: "staff:read",
    create: "staff:create",
    update: "staff:update",
    delete: "staff:delete",
  },
  roles: {
    read: "roles:read",
    create: "roles:create",
    update: "roles:update",
    delete: "roles:delete",
  },
  settings: {
    read: "settings:read",
    update: "settings:update",
    paymentRead: "settings:payment:read",
    paymentUpdate: "settings:payment:update",
    mailRead: "settings:mail:read",
    mailUpdate: "settings:mail:update",
    notificationsRead: "settings:notifications:read",
    notificationsUpdate: "settings:notifications:update",
    /** Legacy alias — still accepted by API for mail tab */
    emailTemplates: "email:templates",
  },
  observability: {
    read: "observability:read",
  },
  finances: {
    speculativeRead: "finances:speculative:read",
    speculativeUpdate: "finances:speculative:update",
  },
  analytics: {
    read: "analytics:read",
  },
  finance: {
    referralsRead: "finances:referrals:read",
    referralsUpdate: "finances:referrals:update",
    tariffsRead: "finances:tariffs:read",
    tariffsUpdate: "finances:tariffs:update",
    checkoutsRead: "finances:checkouts:read",
    paychecksRead: "finances:paychecks:read",
    paychecksUpdate: "finances:paychecks:update",
  },
} as const;

export const KYC_DOC_TYPES = [
  "driver_license",
  "vehicle_insurance",
  "vehicle_registration",
  "background_check",
  "profile_photo",
  "national_id",
  "passport",
  "selfie_with_id",
  "bank_statement",
] as const;

export const KYC_DOC_LABEL_KEYS: Record<string, string> = {
  driver_license: "drivers.docLicense",
  vehicle_insurance: "drivers.docInsurance",
  vehicle_registration: "drivers.docRegistration",
  background_check: "drivers.docBackground",
  profile_photo: "drivers.docPhoto",
  national_id: "drivers.docNationalId",
  passport: "drivers.docPassport",
  selfie_with_id: "drivers.docSelfie",
  bank_statement: "drivers.docBank",
};

export const KYC_STATUS = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export const ENTITY_ACTIONS = {
  view: "view",
  edit: "edit",
  update: "update",
} as const;

export const PROFILE_VARIANT = {
  driver: "driver",
  staff: "staff",
  client: "client",
} as const;

export type ProfileVariant = (typeof PROFILE_VARIANT)[keyof typeof PROFILE_VARIANT];

export const UI = {
  emptyPlaceholder: "—",
  maxRatingStars: 5,
  listPageSize: LIST_DEFAULT_PAGE_SIZE,
  searchDebounceMs: 300,
  profileAvatarSize: 96,
  tableActionsColumnWidth: 56,
  tableRowAvatarSize: 40,
  statCardRadius: "rounded-2xl",
  tableCardRadius: "rounded-2xl",
} as const;

/** BCP-47 locales for `Intl` formatters per app language */
export const DATE_LOCALE_MAP: Record<string, string> = {
  en: "en-CA",
  fr: "fr-CA",
  de: "de-DE",
  es: "es-ES",
  zh: "zh-CN",
};

export const DATE_FORMAT = {
  locale: "en-CA",
  options: {
    dateStyle: "medium",
    timeStyle: "short",
  } as Intl.DateTimeFormatOptions,
  dateOnly: {
    dateStyle: "medium",
  } as Intl.DateTimeFormatOptions,
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
    { href: ROUTES.admin.home, label: "Dashboard" },
    { href: ROUTES.admin.map, label: "Live map", badge: "Live" },
    { href: ROUTES.admin.rides, label: "Rides", badge: "4", permissions: [PERMISSIONS.users.read] },
    { href: ROUTES.admin.users.list, label: "Users" },
    { href: ROUTES.admin.drivers.list, label: "Drivers KYC", badge: "4" },
    { href: ROUTES.admin.tickets, label: "Support", badge: "3" },
    { href: ROUTES.admin.payments, label: "Payments" },
    { href: ROUTES.admin.security, label: "Security logs" },
    { href: ROUTES.admin.audit, label: "Audit logs" },
    { href: ROUTES.admin.settings, label: "Settings" },
    { href: ROUTES.admin.observability, label: "Observability" },
  ],
} as const;
