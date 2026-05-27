import { redirect } from "next/navigation";

import { ROUTES } from "@/configs/const";

/** Legacy route — support tickets moved under Communication → Chat support */
export default function AdminTicketsRedirectPage() {
  redirect(ROUTES.admin.communication.chatSupport);
}
