import { redirect } from "next/navigation";

import { ROUTES } from "@/configs/const";

/** Canonical Settings route redirects to Configurations. */
export default function AdminSettingsPage() {
  redirect(ROUTES.admin.settingsConfigurations);
}
