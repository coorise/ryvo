import { ADMIN_QUERY, ADMIN_TABS, ROUTES } from "@/configs/const";

const SETTINGS_TAB_VALUES = Object.values(ADMIN_TABS.settings);

export function parseSettingsTab(raw: string | null): string {
  if (raw && SETTINGS_TAB_VALUES.includes(raw as (typeof SETTINGS_TAB_VALUES)[number])) {
    return raw;
  }
  return ADMIN_TABS.settings.profile;
}

export function settingsUrl(tab?: string) {
  const params = new URLSearchParams();
  if (tab) params.set(ADMIN_QUERY.tab, tab);
  const qs = params.toString();
  return qs ? `${ROUTES.admin.settings}?${qs}` : ROUTES.admin.settings;
}
