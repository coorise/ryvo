import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Car,
  CreditCard,
  FileText,
  Gauge,
  Gift,
  LayoutDashboard,
  Map,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Tags,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import { ROUTES } from "@/configs/const";

/** Sidebar group ids — used for collapse state in localStorage */
export const ADMIN_NAV_GROUP_IDS = {
  main: "main",
  hr: "hr",
  finances: "finances",
  audits: "audits",
  advanced: "advanced",
} as const;

export type AdminNavGroupId = (typeof ADMIN_NAV_GROUP_IDS)[keyof typeof ADMIN_NAV_GROUP_IDS];

export type AdminNavItemConfig = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  badge?: "rides" | "drivers" | "tickets";
  badgeLive?: boolean;
  permPrefixes?: readonly string[];
  permissions?: readonly string[];
  /** Route always visible when user can access admin (e.g. settings profile) */
  alwaysForAdmin?: boolean;
  staffSection?: boolean;
};

export type AdminNavGroupConfig = {
  id: AdminNavGroupId;
  labelKey: string;
  defaultExpanded: boolean;
  items: AdminNavItemConfig[];
};

export const ADMIN_NAV_OVERVIEW: AdminNavItemConfig = {
  href: ROUTES.admin.home,
  labelKey: "nav.overview",
  icon: LayoutDashboard,
  permPrefixes: [
    "rides:",
    "users:",
    "drivers:",
    "staff:",
    "roles:",
    "support:",
    "payments:",
    "audit:",
    "settings:",
    "observability:",
    "finances:",
    "analytics:",
  ],
};

export const ADMIN_NAV_GROUPS: AdminNavGroupConfig[] = [
  {
    id: ADMIN_NAV_GROUP_IDS.main,
    labelKey: "nav.groups.main",
    defaultExpanded: true,
    items: [
      {
        href: ROUTES.admin.map,
        labelKey: "nav.liveMap",
        icon: Map,
        badgeLive: true,
        permPrefixes: ["rides:"],
      },
      {
        href: ROUTES.admin.rides,
        labelKey: "nav.rides",
        icon: Car,
        badge: "rides",
        permPrefixes: ["rides:"],
      },
      {
        href: ROUTES.admin.users.list,
        labelKey: "nav.users",
        icon: Users,
        permPrefixes: ["users:"],
      },
      {
        href: ROUTES.admin.drivers.list,
        labelKey: "nav.driverKyc",
        icon: UserCheck,
        badge: "drivers",
        permPrefixes: ["drivers:"],
      },
    ],
  },
  {
    id: ADMIN_NAV_GROUP_IDS.hr,
    labelKey: "nav.groups.humanResources",
    defaultExpanded: false,
    items: [
      {
        href: ROUTES.admin.staff.list,
        labelKey: "nav.staff",
        icon: UserCog,
        permPrefixes: ["staff:", "roles:"],
        staffSection: true,
      },
      {
        href: ROUTES.admin.tickets,
        labelKey: "nav.support",
        icon: MessageSquare,
        badge: "tickets",
        permPrefixes: ["support:"],
      },
    ],
  },
  {
    id: ADMIN_NAV_GROUP_IDS.finances,
    labelKey: "nav.groups.finances",
    defaultExpanded: false,
    items: [
      {
        href: ROUTES.admin.finance.referrals,
        labelKey: "nav.referrals",
        icon: Gift,
        permPrefixes: ["finances:referrals:", "payments:"],
      },
      {
        href: ROUTES.admin.finance.tariffs,
        labelKey: "nav.tariffs",
        icon: Tags,
        permPrefixes: ["finances:tariffs:", "payments:"],
      },
      {
        href: ROUTES.admin.finance.checkouts,
        labelKey: "nav.checkouts",
        icon: ShoppingCart,
        permPrefixes: ["finances:checkouts:", "finances:checkouts:update", "payments:"],
      },
      {
        href: ROUTES.admin.payments,
        labelKey: "nav.payments",
        icon: CreditCard,
        permPrefixes: ["payments:"],
      },
      {
        href: ROUTES.admin.finance.paychecks,
        labelKey: "nav.paychecks",
        icon: Wallet,
        permPrefixes: ["finances:paychecks:", "payments:"],
      },
      {
        href: ROUTES.admin.finance.speculative,
        labelKey: "nav.speculativeEstimator",
        icon: TrendingUp,
        permPrefixes: ["finances:speculative:", "payments:"],
      },
    ],
  },
  {
    id: ADMIN_NAV_GROUP_IDS.audits,
    labelKey: "nav.groups.audits",
    defaultExpanded: false,
    items: [
      {
        href: ROUTES.admin.security,
        labelKey: "nav.security",
        icon: Shield,
        permPrefixes: ["audit:", "audit:update"],
      },
      {
        href: ROUTES.admin.audit,
        labelKey: "nav.activityLogs",
        icon: FileText,
        permPrefixes: ["audit:"],
      },
      {
        href: ROUTES.admin.analytics,
        labelKey: "nav.analytics",
        icon: BarChart3,
        permPrefixes: ["analytics:", "audit:"],
      },
    ],
  },
  {
    id: ADMIN_NAV_GROUP_IDS.advanced,
    labelKey: "nav.groups.advanced",
    defaultExpanded: false,
    items: [
      {
        href: ROUTES.admin.observability,
        labelKey: "nav.observability",
        icon: Gauge,
        permPrefixes: ["observability:", "settings:"],
      },
      {
        href: ROUTES.admin.settings,
        labelKey: "common.settings",
        icon: Settings,
        alwaysForAdmin: true,
      },
    ],
  },
];

/** All admin leaf paths for route matching (longest prefix wins) */
export const ADMIN_PATH_PREFIXES: { prefix: string; item: AdminNavItemConfig }[] = (() => {
  const all: AdminNavItemConfig[] = [
    ADMIN_NAV_OVERVIEW,
    ...ADMIN_NAV_GROUPS.flatMap((g) => g.items),
  ];
  return all
    .map((item) => ({ prefix: item.href, item }))
    .sort((a, b) => b.prefix.length - a.prefix.length);
})();
