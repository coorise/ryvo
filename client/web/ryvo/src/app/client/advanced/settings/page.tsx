import { PortalPlaceholder } from "@/components/portal/portal-placeholder";
import { PortalTabShell } from "@/components/portal/portal-tab-shell";

export default function ClientSettingsPage() {
  return (
    <PortalTabShell
      defaultTab="profile"
      tabs={[
        { id: "profile", label: "Profile", content: <PortalPlaceholder title="Profile" /> },
        { id: "general", label: "General", content: <PortalPlaceholder title="General" /> },
        { id: "payment", label: "Payment", content: <PortalPlaceholder title="Payment" /> },
        {
          id: "notifications",
          label: "Notifications",
          content: <PortalPlaceholder title="Notifications" />,
        },
      ]}
    />
  );
}
