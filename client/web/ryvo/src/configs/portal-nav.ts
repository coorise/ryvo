import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Car,
  CreditCard,
  FileText,
  LayoutDashboard,
  Mail,
  Map,
  MessageSquare,
  MessagesSquare,
  Settings,
  Shield,
  SlidersHorizontal,
  Star,
  User,
  Users,
  Wallet,
} from "lucide-react";

export const PORTAL_NAV_GROUP_IDS = {
  main: "main",
  communication: "communication",
  hr: "hr",
  finances: "finances",
  audits: "audits",
  settings: "settings",
} as const;

export type PortalNavGroupId = (typeof PORTAL_NAV_GROUP_IDS)[keyof typeof PORTAL_NAV_GROUP_IDS];
export type PortalArea = "driver" | "client";

export type PortalNavItemConfig = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Optional ABAC — hide item when user lacks any listed role. */
  roles?: readonly string[];
  permissions?: readonly string[];
  permPrefixes?: readonly string[];
};

export type PortalNavGroupConfig = {
  id: PortalNavGroupId;
  labelKey: string;
  defaultExpanded: boolean;
  items: PortalNavItemConfig[];
};

export type PortalNavConfig = {
  homeHref: string;
  overview: PortalNavItemConfig;
  groups: PortalNavGroupConfig[];
};

const DRIVER_ROUTES = {
  home: "/driver",
  liveMap: "/driver/main/live-map",
  rides: "/driver/main/rides",
  clients: "/driver/main/clients",
  kyc: "/driver/main/kyc",
  notifications: "/driver/communication/notifications",
  chat: "/driver/communication/chat",
  messages: "/driver/communication/messages",
  chatSupport: "/driver/communication/chat-support",
  feedbacks: "/driver/hr/feedbacks",
  payments: "/driver/finances/payments",
  securityLogs: "/driver/audits/security-logs",
  activityLogs: "/driver/audits/activity-logs",
  analytics: "/driver/audits/analytics",
  profile: "/driver/settings/profile",
  configurations: "/driver/settings/configurations",
} as const;

const CLIENT_ROUTES = {
  home: "/client",
  liveMap: "/client/main/live-map",
  rides: "/client/main/rides",
  drivers: "/client/main/drivers",
  notifications: "/client/communication/notifications",
  chat: "/client/communication/chat",
  chatSupport: "/client/communication/chat-support",
  feedbacks: "/client/hr/feedbacks",
  payments: "/client/finances/payments",
  securityLogs: "/client/audits/security-logs",
  activityLogs: "/client/audits/activity-logs",
  analytics: "/client/audits/analytics",
  profile: "/client/settings/profile",
  configurations: "/client/settings/configurations",
} as const;

export const PORTAL_ROUTES = {
  driver: DRIVER_ROUTES,
  client: CLIENT_ROUTES,
} as const;

export const DRIVER_PORTAL_NAV: PortalNavConfig = {
  homeHref: DRIVER_ROUTES.home,
  overview: {
    href: DRIVER_ROUTES.home,
    labelKey: "portal.nav.overview",
    icon: LayoutDashboard,
  },
  groups: [
    {
      id: PORTAL_NAV_GROUP_IDS.main,
      labelKey: "portal.nav.groups.main",
      defaultExpanded: true,
      items: [
        { href: DRIVER_ROUTES.liveMap, labelKey: "portal.nav.liveMap", icon: Map },
        { href: DRIVER_ROUTES.rides, labelKey: "portal.nav.rides", icon: Car },
        { href: DRIVER_ROUTES.clients, labelKey: "portal.nav.clients", icon: Users },
        { href: DRIVER_ROUTES.kyc, labelKey: "portal.nav.driverKyc", icon: FileText },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.communication,
      labelKey: "portal.nav.groups.communication",
      defaultExpanded: false,
      items: [
        { href: DRIVER_ROUTES.notifications, labelKey: "portal.nav.notifications", icon: Bell },
        { href: DRIVER_ROUTES.chat, labelKey: "portal.nav.chat", icon: MessageSquare },
        { href: DRIVER_ROUTES.messages, labelKey: "portal.nav.messages", icon: Mail },
        { href: DRIVER_ROUTES.chatSupport, labelKey: "portal.nav.chatSupport", icon: MessagesSquare },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.hr,
      labelKey: "portal.nav.groups.hr",
      defaultExpanded: false,
      items: [
        { href: DRIVER_ROUTES.feedbacks, labelKey: "portal.nav.feedbacks", icon: Star },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.finances,
      labelKey: "portal.nav.groups.finances",
      defaultExpanded: false,
      items: [
        { href: DRIVER_ROUTES.payments, labelKey: "portal.nav.payments", icon: Wallet },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.audits,
      labelKey: "portal.nav.groups.audits",
      defaultExpanded: false,
      items: [
        { href: DRIVER_ROUTES.securityLogs, labelKey: "portal.nav.securityLogs", icon: Shield },
        { href: DRIVER_ROUTES.activityLogs, labelKey: "portal.nav.activityLogs", icon: FileText },
        { href: DRIVER_ROUTES.analytics, labelKey: "portal.nav.analytics", icon: BarChart3 },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.settings,
      labelKey: "portal.nav.groups.settings",
      defaultExpanded: false,
      items: [
        { href: DRIVER_ROUTES.profile, labelKey: "portal.nav.profile", icon: User },
        {
          href: DRIVER_ROUTES.configurations,
          labelKey: "portal.nav.configurations",
          icon: SlidersHorizontal,
        },
      ],
    },
  ],
};

export const CLIENT_PORTAL_NAV: PortalNavConfig = {
  homeHref: CLIENT_ROUTES.home,
  overview: {
    href: CLIENT_ROUTES.home,
    labelKey: "portal.nav.overview",
    icon: LayoutDashboard,
  },
  groups: [
    {
      id: PORTAL_NAV_GROUP_IDS.main,
      labelKey: "portal.nav.groups.main",
      defaultExpanded: true,
      items: [
        { href: CLIENT_ROUTES.liveMap, labelKey: "portal.nav.liveMap", icon: Map },
        { href: CLIENT_ROUTES.rides, labelKey: "portal.nav.rides", icon: Car },
        { href: CLIENT_ROUTES.drivers, labelKey: "portal.nav.drivers", icon: User },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.communication,
      labelKey: "portal.nav.groups.communication",
      defaultExpanded: false,
      items: [
        { href: CLIENT_ROUTES.notifications, labelKey: "portal.nav.notifications", icon: Bell },
        { href: CLIENT_ROUTES.chat, labelKey: "portal.nav.chat", icon: MessageSquare },
        { href: CLIENT_ROUTES.chatSupport, labelKey: "portal.nav.chatSupport", icon: MessagesSquare },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.hr,
      labelKey: "portal.nav.groups.hr",
      defaultExpanded: false,
      items: [
        { href: CLIENT_ROUTES.feedbacks, labelKey: "portal.nav.feedbacks", icon: Star },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.finances,
      labelKey: "portal.nav.groups.finances",
      defaultExpanded: false,
      items: [
        { href: CLIENT_ROUTES.payments, labelKey: "portal.nav.payments", icon: CreditCard },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.audits,
      labelKey: "portal.nav.groups.audits",
      defaultExpanded: false,
      items: [
        { href: CLIENT_ROUTES.securityLogs, labelKey: "portal.nav.securityLogs", icon: Shield },
        { href: CLIENT_ROUTES.activityLogs, labelKey: "portal.nav.activityLogs", icon: FileText },
        { href: CLIENT_ROUTES.analytics, labelKey: "portal.nav.analytics", icon: BarChart3 },
      ],
    },
    {
      id: PORTAL_NAV_GROUP_IDS.settings,
      labelKey: "portal.nav.groups.settings",
      defaultExpanded: false,
      items: [
        { href: CLIENT_ROUTES.profile, labelKey: "portal.nav.profile", icon: User },
        {
          href: CLIENT_ROUTES.configurations,
          labelKey: "portal.nav.configurations",
          icon: SlidersHorizontal,
        },
      ],
    },
  ],
};

export function portalNavForArea(area: PortalArea): PortalNavConfig {
  return area === "driver" ? DRIVER_PORTAL_NAV : CLIENT_PORTAL_NAV;
}

export function portalNavGroupsForPath(pathname: string, config: PortalNavConfig): Set<PortalNavGroupId> {
  const active = new Set<PortalNavGroupId>();
  for (const group of config.groups) {
    if (group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      active.add(group.id);
    }
  }
  return active;
}
