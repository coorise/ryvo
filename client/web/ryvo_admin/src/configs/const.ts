export const APP_NAME = "Ryvo-Line";
export const APP_TAGLINE = "Ride smarter";
export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "zh", "de"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const STORAGE_KEYS = {
  auth: "ryvo.admin.auth.v1",
  theme: "ryvo.admin.theme",
  language: "ryvo.admin.lang",
} as const;

/** Isolated from customer portal — localhost cookies are shared across ports. */
export const SUPABASE_AUTH_COOKIE = "ryvo-admin-auth" as const;

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
    communication: {
      notifications: "/admin/communication/notifications",
      messages: "/admin/communication/messages",
      messagesNew: "/admin/communication/messages/new",
      messageEdit: (id: string) => `/admin/communication/messages/${id}/edit`,
      chatSupport: "/admin/communication/chat-support",
    },
    hr: {
      feedbacks: "/admin/hr/feedbacks",
    },
    payments: "/admin/payments",
    security: "/admin/security",
    audit: "/admin/audit",
    settings: "/admin/settings",
    settingsProfile: "/admin/settings/profile",
    settingsConfigurations: "/admin/settings/configurations",
    settingsTasks: "/admin/settings/tasks",
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
    coupons: "coupons",
    referrals: "referrals",
    settings: "settings",
  },
  referralsCoupons: {
    codes: "codes",
    usedByClients: "used-by-clients",
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
  chatSupport: {
    clients: "clients",
    drivers: "drivers",
  },
  feedbacks: {
    product: "product-services",
    drivers: "drivers-services",
    staff: "staff-services",
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
  createdAt: "created_at",
  amount: "amount",
  status: "status",
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
    driverDocumentView: (driverId: string, docType: string) =>
      ["admin", "driver", driverId, "document", docType, "view"] as const,
    rbacMatrix: ["rbac", "matrix"] as const,
    rbacMe: ["rbac", "me"] as const,
    dashboard: ["admin", "dashboard"] as const,
    messageCampaigns: ["admin", "communication", "messages"] as const,
    messageCampaign: (id: string) => ["admin", "communication", "messages", id] as const,
    notificationsInbox: ["admin", "notifications", "inbox"] as const,
    feedbacksAnalytics: ["admin", "feedbacks", "analytics"] as const,
    analytics: (period: string, audience: string) =>
      ["admin", "analytics", period, audience] as const,
    liveMapDrivers: ["admin", "map", "onlineDrivers"] as const,
    platformPublic: ["platform", "public"] as const,
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
  feedbacks: {
    read: "feedbacks:read",
    update: "feedbacks:update",
  },
  communication: {
    messagesRead: "communication:messages:read",
    messagesCreate: "communication:messages:create",
    messagesUpdate: "communication:messages:update",
    messagesDelete: "communication:messages:delete",
    messagesSend: "communication:messages:send",
    notificationsRead: "communication:notifications:read",
    notificationsDelete: "communication:notifications:delete",
    chatRead: "communication:chat:read",
    chatReply: "communication:chat:reply",
    chatCreate: "communication:chat:create",
    chatUpdate: "communication:chat:update",
  },
  map: {
    read: "map:read",
  },
  tasks: {
    read: "tasks:read",
    manage: "tasks:manage",
  },
  support: {
    read: "support:read",
    reply: "support:reply",
    update: "support:update",
  },
  rides: {
    read: "rides:read",
    update: "rides:update",
  },
  finance: {
    referralsRead: "finances:referrals:read",
    referralsUpdate: "finances:referrals:update",
    tariffsRead: "finances:tariffs:read",
    tariffsUpdate: "finances:tariffs:update",
    checkoutsRead: "finances:checkouts:read",
    checkoutsUpdate: "finances:checkouts:update",
    paychecksRead: "finances:paychecks:read",
    paychecksUpdate: "finances:paychecks:update",
    subscriptionsRead: "finances:subscriptions:read",
    subscriptionsUpdate: "finances:subscriptions:update",
  },
  payments: {
    read: "payments:read",
  },
  audit: {
    read: "audit:read",
    update: "audit:update",
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

export type LandingCity = {
  name: string;
  province: string;
  imageUrl: string;
  drivers: number;
  status: "live" | "soon";
};

/** Landing page city cards (from product template). */
export const LANDING_CITIES: LandingCity[] = [
  {
    name: "Montréal",
    province: "Québec",
    imageUrl: "https://images.unsplash.com/photo-1519178614-68673b201f36?w=600&q=80",
    drivers: 2840,
    status: "live",
  },
  {
    name: "Toronto",
    province: "Ontario",
    imageUrl: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=600&q=80",
    drivers: 4120,
    status: "live",
  },
  {
    name: "Vancouver",
    province: "B.C.",
    imageUrl: "https://images.unsplash.com/photo-1559511260-66a654ae982a?w=600&q=80",
    drivers: 1980,
    status: "live",
  },
  {
    name: "Québec",
    province: "Québec",
    imageUrl: "https://images.unsplash.com/photo-1519832979-6fa011b87667?w=600&q=80",
    drivers: 740,
    status: "live",
  },
  {
    name: "Ottawa",
    province: "Ontario",
    imageUrl: "https://images.unsplash.com/photo-1565876427310-71a4500ea814?w=600&q=80",
    drivers: 880,
    status: "live",
  },
  {
    name: "Calgary",
    province: "Alberta",
    imageUrl: "https://images.unsplash.com/photo-1558584673-c834fb1cc3ca?w=600&q=80",
    drivers: 1240,
    status: "live",
  },
  {
    name: "Edmonton",
    province: "Alberta",
    imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=600&q=80",
    drivers: 920,
    status: "live",
  },
  {
    name: "Winnipeg",
    province: "Manitoba",
    imageUrl: "https://images.unsplash.com/photo-1593691509543-c55fb32e3b1b?w=600&q=80",
    drivers: 540,
    status: "live",
  },
  {
    name: "Halifax",
    province: "N.S.",
    imageUrl: "https://images.unsplash.com/photo-1569696251872-5dcf39dcc60e?w=600&q=80",
    drivers: 410,
    status: "live",
  },
  {
    name: "Gatineau",
    province: "Québec",
    imageUrl: "https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=600&q=80",
    drivers: 320,
    status: "live",
  },
  {
    name: "Sherbrooke",
    province: "Québec",
    imageUrl: "https://images.unsplash.com/photo-1565717893783-32932d82e11e?w=600&q=80",
    drivers: 220,
    status: "soon",
  },
  {
    name: "Trois-Rivières",
    province: "Québec",
    imageUrl: "https://images.unsplash.com/photo-1514905552197-0610a4d8fd73?w=600&q=80",
    drivers: 180,
    status: "soon",
  },
];

export const LANDING_NAV_LINKS = [
  { labelKey: "landing.nav.features", href: "#features" },
  { labelKey: "landing.nav.cities", href: "#cities" },
  { labelKey: "landing.nav.drivers", href: "#drivers" },
  { labelKey: "landing.nav.safety", href: "#safety" },
] as const;

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
    { href: ROUTES.admin.users.list, label: "Clients" },
    { href: ROUTES.admin.drivers.list, label: "Drivers KYC", badge: "4" },
    { href: ROUTES.admin.communication.chatSupport, label: "Chat support", badge: "3" },
    { href: ROUTES.admin.hr.feedbacks, label: "Feedbacks" },
    { href: ROUTES.admin.settingsTasks, label: "Tasks" },
    { href: ROUTES.admin.payments, label: "Payments" },
    { href: ROUTES.admin.security, label: "Security logs" },
    { href: ROUTES.admin.audit, label: "Audit logs" },
    { href: ROUTES.admin.settings, label: "Settings" },
    { href: ROUTES.admin.observability, label: "Observability" },
  ],
} as const;
