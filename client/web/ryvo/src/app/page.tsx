import { ClientRedirect } from "@/components/routing/client-redirect";
import { ROUTES } from "@/configs";

export default function HomePage() {
  return <ClientRedirect href={ROUTES.landing} />;
}
