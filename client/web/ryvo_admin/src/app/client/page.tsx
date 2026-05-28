import { redirect } from "next/navigation";

/** Legacy login redirect targeted /client; admin app only serves /admin. */
export default function ClientLegacyRedirectPage() {
  redirect("/admin");
}
