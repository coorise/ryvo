import { redirect } from "next/navigation";

import { ROUTES } from "@/configs";

/** Admin accounts are created by staff in the dashboard — no public registration. */
export default function RegisterPage() {
  redirect(ROUTES.auth.login);
}
